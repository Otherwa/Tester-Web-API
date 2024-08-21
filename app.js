let express = require("express");
let app = express();
let Excel = require("exceljs");
let bodyParser = require("body-parser");
const cors = require("cors");
let keyToLabel = require("./fromkeytolabel.json");
//let dataCollector = require("./data_collector.json");
const fs = require("fs");
const logger = require("./utils/logger");
let http = require('http')
let https = require('https')



const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

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

async function storeDataToExcel2(dataWithKey) {
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
  for (let i in dataWithKey["excel2"]) {
    for (let j in userdata) {
      if (userdata[j] == i) {
        userdata[j] = dataWithKey["excel2"][i];
      }
    }
  }
  let wb = await workbook.xlsx.readFile("./heart.xlsx");
  wb = wb.getWorksheet(2);
  wb.columns = wbColumn;
  wb.addRow(userdata);
  await workbook.xlsx.writeFile("./heart.xlsx");
}

//readExcel();
app.post("/postexcel", async (req, res) => {
  try {
    await storeDataTOExcel1(req.body);
    await storeDataToExcel2(req.body);
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


app.listen(3005, () => {
  logger.info("Listening on port 3005");
});
