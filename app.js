let express = require("express");
let app = express();
let Excel = require("exceljs");
let bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const logger = require("./utils/logger");
<<<<<<< HEAD
let http = require("http");
let https = require("https");
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
=======



>>>>>>> 910d3d59717415e41fbd5f92f77bc62355a693b9

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use(express.json());

const users = [];

async function storeDataTOExcel1(dataWithKey) {
  let wbColumn = [];
  let userdata = dataWithKey.data;
  let template = dataWithKey.keys;
  for (let i = 0; i < template.length; i++) {
    wbColumn.push({
      header: template[i].label,
      key: template[i].value,
      width: 32,
    });
  }
  const workbook = new Excel.Workbook();
  let wb = await workbook.xlsx.readFile("./heart.xlsx");
  wb = wb.getWorksheet(1);
  wb.columns = wbColumn;
  wb.addRow(userdata);
  await workbook.xlsx.writeFile("./heart.xlsx");
}



//readExcel();
app.post("/postexcel", async (req, res) => {
  try {
    await storeDataTOExcel1(req.body);
    logger.info("Succssfully inserted data into excel");
    res.send({
      status: "success",
    });
  } catch (err) {
    logger.error(err.stack);
    res.send({
      status: "unsuccess",
      msg: err.message,
    });
  }
});

app.get("/formjson", async (req, res) => {
  try {
    logger.info("App intialized");
    let data = fs.readFileSync("data_collector.json");
    let formatedData = JSON.parse(data.toString());
    res.json(formatedData);
  } catch (error) {
    logger.error(err.stack);
    res.send({
      status: "unsuccess",
      msg: err.message,
    });
  }
});

// Register
app.post(
  "/register",
  [
    body("phoneNumber").isNumeric().withMessage("Please enter numbers").isLength({min:10,max:10}).withMessage("Enter correct number."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, password } = req.body;

    const userExists = users.find((user) => user.phoneNumber === phoneNumber);
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { phoneNumber, password: hashedPassword };
      users.push(newUser);
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error registering user", error });
    }
  }
);

//login
app.post(
  "/login",
  [
    body("phoneNumber")
      .isNumeric()
      .withMessage("Please enter numbers")
      .isLength({ min: 10, max: 10 })
      .withMessage("Enter a valid phone number."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, password } = req.body;

    const user = users.find((user) => user.phoneNumber === phoneNumber);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ phoneNumber: user.phoneNumber }, "secretKey", {
        expiresIn: "1h",
      });

      res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      res.status(500).json({ message: "Error logging in", error });
    }
  }
);


app.listen(3005, () => {
  logger.info("Listening on port 3005");
});
