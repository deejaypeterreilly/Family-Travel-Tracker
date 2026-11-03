import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config'

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.USERNAME,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = []


async function dbUsers(){
  const result = await db.query("SELECT * FROM users")
  users = [];
  
  result.rows.forEach(user => {
    users.push(user)
  });
}


async function checkVisisted() {
  const result = await db.query(`SELECT country_code FROM visited_countries WHERE user_id = ${currentUserId}`);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  await dbUsers()
  let currentUserIndex = users.findIndex((user) => user.id === currentUserId)
  const countries = await checkVisisted();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[currentUserIndex].color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  // const result = await db.query(`SELECT country_code FROM visited_countries WHERE user_id = ${req.body.user}`)
  if (req.body.add === "new"){
    res.render("new.ejs")
  }
  else {
    currentUserId = parseInt(req.body.user);
    res.redirect("/")
  }
  
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  db.query(`INSERT INTO users (name, color) VALUES ($1, $2)`, [req.body.name, req.body.color])
  res.redirect("/")
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
