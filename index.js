const axios = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "enter command >",
});

readline.prompt();
readline.on("line", async (line) => {
  switch (line.trim()) {
    case "list vegan foods":
      {
        const { data } = await axios.get(`http://localhost:3001/food`);

        function* listVeganFoods() {
          let idx = 0;
          const veganOnly = data.filter((item) => {
            return item.dietary_preferences.includes("vegan");
          });
          while (veganOnly[idx]) {
            yield veganOnly[idx];
            idx++;
          }
        }

        for (const item of listVeganFoods()) {
          console.log(item.name);
        }

        readline.prompt();
      }
      break;
    case "log":
      {
        const { data } = await axios.get("http://localhost:3001/food");
        const dataIt = data[Symbol.iterator]();
        let actionIt;

        function* actionGenerator() {
          const food = yield;
          const servingSize = yield askForServingSize();
          yield displayCalories(servingSize, food);
        }

        function askForServingSize() {
          readline.question(
            `How many servings did you eat? (as a decimal 1, 0.5, 1.25, ect.. )`,
            (servingSize) => {
              if (servingSize === "nevermind" || servingSize === "n") {
                actionIt.return();
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
                food: food.name,
                servingSize,
                calories: Number.parseFloat(
                  calories * parseInt(servingSize, 10)
                ),
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
    default:
      break;
  }
});
