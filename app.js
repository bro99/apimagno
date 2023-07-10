const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const http = require('http');
const port = process.env.PORT || 80;
const server = http.createServer(app);
require('dotenv').config();
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const queue = [];
let isProcessing = false;

const config = [
  "--headless",
  "--whitelisted-ips",
  "--disable-durable_storag",
  "--disable-protected_media_identifier",
  "--disable-app_banner",
  "--disable-site_engagement",
  "--disable-notifications",
  "--disable-push_messaging",
  "--disable-extensions",
  "--disable-plugins",
  "--disable-mouselock",
  "--disable-media_stream",
  "--disable-media_stream_mic",
  "--disable-media_stream_camera",
  "--disable-ppapi_broker",
  "--disable-automatic_downloads",
  "--disable-midi_sysex",
  "--disable-metro_switch_to_desktop",
  "--disable-extensions",
  "--disable-gpu",
  "--disable-infobars",
  "--no-sandbox",
  "--disable-dev-shm-usage"
];

const chromeOptions = new chrome.Options().addArguments(config);

// Função para criar uma nova instância do WebDriver
async function createDriver() {
  const service = new chrome.ServiceBuilder(chromedriver.path).build();
  
  const options = new chrome.Options();
  options.addArguments(config);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.get('https://login.doterra.com/br/pt-br/sign-in');
  await driver.wait(until.elementLocated(By.className('form-field form-field-text')), 60000);
  await driver.findElement(By.className('form-field form-field-text')).sendKeys(process.env.ID);
  await driver.findElement(By.className('form-field form-field-password ')).sendKeys(process.env.PASSWORD, Key.ENTER);
  console.log("Loguei");
  
  return driver;
}

// Variável global para armazenar a instância do driver
let driverInstance = null;

// Função para obter a instância do driver
async function getDriverInstance() {
  if (!driverInstance) {
    driverInstance = await createDriver();
  }
  return driverInstance;
}

// Where we will keep books
let id = [];
const result = '';
app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/teste', async (req, res) => {
  try {
    // Reading isbn from the URL
    console.log("Funcionando");

    console.log("Browser fechado");
  } catch (error) {
    console.error("Ocorreu um erro: ", error);
    console.log("Reiniciando o processo...");
    res.sendStatus(500); // Return an error status code to the client
  }
});
app.get('/id/:isbn', async (req, res) => {
  try {
    // Reading isbn from the URL
    console.log("Entrei na função");
    let isbn = req.params.isbn;

    // Adding the request to the queue
    queue.push({ isbn, res });

    // Checking if there are any requests being processed
    if (!isProcessing) {
      // Starting the processing loop
      processQueue();
    }
  } catch (error) {
    console.error("Ocorreu um erro: ", error);
    console.log("Reiniciando o processo...");
    res.sendStatus(500); // Return an error status code to the client
    // Reiniciando o processo
    isProcessing = false;
    processQueue();
  }
});

async function processQueue() {
  // Checking if there are any requests in the queue
  if (queue.length > 0) {
    // Setting the processing flag to true
    isProcessing = true;

    // Taking the next request from the queue
    const { isbn, res } = queue.shift();
//Onde está dando o erro?
    try {
      const driver = await getDriverInstance();

      await driver.sleep(20000);
      console.log("Indo para API");
      await driver.executeScript(`window.open('https://beta-doterra.myvoffice.com/index.cfm?Fuseaction=evo_Modules.Placements&FuseSubAction=GetName&DistID=${isbn}', 'Scrapping')`);

      const handles = await driver.getAllWindowHandles();
      await driver.switchTo().window(handles[1]);
      const test = await driver.findElement(By.tagName(`body`));
      res.send(await test.getText());

      console.log("Browser fechado");
      // Não precisamos chamar `driver.quit()` aqui, pois estamos compartilhando a instância global
    } catch (error) {
      console.error("Ocorreu um erro: ", error);
      console.log("Reiniciando o processo...");
      res.sendStatus(500); // Return an error status code to the client
      // Reiniciando o processo
      isProcessing = false;
      processQueue();
    }

    // Process the next request in the queue
    processQueue();
  } else {
    // No more requests in the queue, set the processing flag to false
    isProcessing = false;
  }
}

server.listen(port, function () {
  console.log('App running on *: ' + port);
});
