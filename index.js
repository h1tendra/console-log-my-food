/* eslint-disable no-console */
const axios = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "enter command >",
});

let actionIt;

function* listVeganFoods(data) {
  try {
    let idx = 0;
    const veganOnly = data.filter((item) => {
      return item.dietary_preferences.includes("vegan");
    });
    while (veganOnly[idx]) {
      yield veganOnly[idx];
      idx++;
    }
  } catch (error) {
    console.log("Something went wrong while listing vegan items", {
      error,
    });
  }
}

function* actionGenerator() {
  try {
    const food = yield;
    const servingSize = yield askForServingSize();
    yield displayCalories(servingSize, food);
  } catch (error) {
    console.log({ error });
  }
}

function askForServingSize() {
  readline.question(
    `How many servings did you eat? (as a decimal 1, 0.5, 1.25, ect.. )`,
    (servingSize) => {
      if (servingSize === "nevermind" || servingSize === "n") {
        return actionIt.return();
      }

      servingSize = +servingSize;

      if (Number.isNaN(servingSize)) {
        actionIt.throw("Please, numbers only");
      } else {
        actionIt.next(servingSize);
      }
    }
  );
}

async function displayCalories(servingSize = 1, food) {
  const { calories } = food;
  console.log(
    `${
      food.name
    } with a serving size of ${servingSize} has a ${Number.parseFloat(
      calories * parseInt(servingSize, 10)
    )}`
  );

  const { data } = await axios.get(`http://localhost:3001/users/1`);
  const userLog = data.log || [];
  const putBody = {
    ...data,
    log: [
      ...userLog,
      {
        [Date.now()]: {
          food: food.name,
          servingSize,
          calories: Number.parseFloat(calories * parseInt(servingSize, 10)),
        },
      },
    ],
  };
  await axios.put(`http://localhost:3001/users/1`, putBody, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  actionIt.next();
  readline.prompt();
}

readline.prompt();
readline.on("line", async (line) => {
  switch (line.trim()) {
    case "list vegan foods":
      {
        const { data } = await axios.get(`http://localhost:3001/food`);
        for (const item of listVeganFoods(data)) {
          console.log(item.name);
        }

        readline.prompt();
      }
      break;
    case "log":
      {
        const { data } = await axios.get("http://localhost:3001/food");
        const dataIt = data[Symbol.iterator]();

        readline.question("What would you like to log today?", async (item) => {
          let position = dataIt.next();

          while (!position.done) {
            const food = position.value.name;

            if (item === food) {
              console.log(`${food} has ${position.value.calories} calories`);
              actionIt = actionGenerator();
              actionIt.next();
              actionIt.next(position.value);
            }

            position = dataIt.next();
          }

          readline.prompt();
        });
      }
      break;
    case "today's log":
      {
        readline.question("Email: ", async (emailAddress) => {
          const { data } = await axios.get(
            `http://localhost:3001/users?email=${emailAddress}`
          );
          const foodLog = data[0].log || [];
          let totalCalories = 0;

          function* getFoodLog() {
            try {
              yield* foodLog;
            } catch (error) {
              console.log("Error reading the food log", { error });
            }
          }

          const logIterator = getFoodLog();

          for (const item of logIterator) {
            const timestamp = Object.keys(item)[0];

            if (isToday(new Date(Number(timestamp)))) {
              console.log(
                `${item[timestamp].food}, ${item[timestamp].servingSize} serving(s)`
              );
              totalCalories += item[timestamp].calories;
            }

            if (totalCalories >= 12000) {
              console.log(`Impressive! You have reached 12,000 calories`);
              logIterator.return();
            }
          }

          console.log("-------------");
          console.log(`Total Calories: ${totalCalories}`);
          console.log("-------------");

          readline.prompt();
        });
      }
      break;
    default:
      break;
  }
});

function isToday(timestamp) {
  const today = new Date();
  return (
    today.getDate() === timestamp.getDate() &&
    today.getMonth() === timestamp.getMonth() &&
    today.getFullYear() === timestamp.getFullYear()
  );
}
