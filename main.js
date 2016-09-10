/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
// Leave the above lines for propper jshinting
//Type Node.js Here :)

var address = '0.0.0.0';
var port    = 80;
var http    = require('http');
var url     = require('url');
var fs      = require('fs');
var qs      = require('querystring');
var sleep   = require('sleep');

var bottleConfigFileName = 'bottles.json';
var coctailConfigFileName = 'coctails.json';

var mraa = require('mraa'); //require mraa
var urlobj;

var STATES = {
    READY : {value: 1, name: "Ready",   comment: "Готов"},
    BUSY  : {value: 2, name: "Busy",    comment: "Готовлю коктейль. Подождите пожалуйста..." },
    ERROR : {value: 3, name: "Error",   comment: "Ошибка. Проверьте уровень жидкости в бутылке!" },
};

var ENGINE_TIMEOUT = 500;

var MILLISECS_PER_MILLILITER = 135; //calibrated value

function msToMl(millisecs)
{
    return millisecs / MILLISECS_PER_MILLILITER;
}

function mlToMs(milliliters)
{
    return milliliters * MILLISECS_PER_MILLILITER;
}

function activateEngine(pin1, level1, pin2, level2)
{
    pin1.write(level1);
    pin2.write(level2);
}

function deactivateEngine(pin1, pin2)
{
    pin1.write(0);
    pin2.write(0);
}

function openValve(pin1, pin2)
{
    activateEngine(pin1, 0, pin2, 1);

    setTimeout(function() {
        deactivateEngine(pin1, pin2);
    }, ENGINE_TIMEOUT);
}

function closeValve(pin1, pin2)
{
    activateEngine(pin1, 1, pin2, 0);
    sleep.usleep(ENGINE_TIMEOUT * 1000);
    deactivateEngine(pin1, pin2);
}

var coctails = [];
function loadCoctails(filename)
{
    console.log("Loading coctails");

    if(!fs.existsSync(filename)) {
        console.log("Coctail file " + filename + " not found");
    }
    else {
        var file = fs.readFileSync(filename);

        coctails = JSON.parse(file);

        console.log(coctails);

    }
}

var bottles = [];
function loadBottles(filename)
{
    console.log("Loading bottles");
    if (fs.existsSync(filename)) {
        var file = fs.readFileSync(filename);
        bottles = JSON.parse(file);
        console.log(bottles);
    }
    else {
        console.error("Bottles file " + filename + " not found");
    }
}

function initBottlePins()
{
    console.log("Init bottle GPIO pins");

    for (var i = 0; i < bottles.length; ++i) {
        bottles[i].pinObj1 = new mraa.Gpio(bottles[i].pin1);
        bottles[i].pinObj1.dir(mraa.DIR_OUT);
        bottles[i].pinObj1.write(0);

        bottles[i].pinObj2 = new mraa.Gpio(bottles[i].pin2);
        bottles[i].pinObj2.dir(mraa.DIR_OUT);
        bottles[i].pinObj2.write(0);

        bottles[i].state = STATES.READY;
    }

}

function closeAllValves()
{
    console.log("Close all valves");
    //reset the valves to their initial state
    for (var i = 0; i < bottles.length; ++i) {
        console.log("Close valve " + i);
        closeValve(bottles[i].pinObj1, bottles[i].pinObj2);
        sleep.usleep(500000);
    }
}

function initPeripherals()
{
    console.log("Init peripherals");
    closeAllValves();
}

function initBarbotConfiguration()
{
    loadCoctails(site + '/' + coctailConfigFileName);
    loadBottles(site + '/' + bottleConfigFileName);
    initBottlePins();
    setTimeout(initPeripherals(), 500);
}

var extensions =
{
    "css"   : "text/css",
    "xml"   : "text/xml",
    "htm"   : "text/html",
    "html"  : "text/html",
    "js"    : "application/javascript",
    "json"  : "application/json",
    "txt"   : "text/plain",
    "bmp"   : "image/bmp",
    "gif"   : "image/gif",
    "jpeg"  : "image/jpeg",
    "jpg"   : "image/jpeg",
    "png"   : "image/png",
    "ico"   : "image/ico"
};

var files =
{
    "/"                 : true,
    "/index.html"     : true,
    "/favicon.ico"    : true,
    "/state"          : true,
    "/makeCoctail"    : true,
    "/getCoctails"    : true,
    "/getBottles"     : true,
    "/404.html"       : true,
    "/button_pressed.png"       : true,
    "/assets/css/app.css" : true,
    "/assets/css/bootstrap.css" : true,
    "/assets/css/main.css" : true,
    "/assets/css/responsive.css" : true,
    "/assets/extras/animate.css" : true,
    "/assets/fonts/glyphicons-halflings-regular.eot" : true,
    "/assets/fonts/glyphicons-halflings-regular.svg" : true,
    "/assets/fonts/glyphicons-halflings-regular.ttf" : true,
    "/assets/fonts/glyphicons-halflings-regular.woff" : true,
    "/assets/fonts/font-awesome/font-awesome.min.css" : true,
    "/assets/fonts/font-awesome/fontawesome-webfont.eot" : true,
    "/assets/fonts/font-awesome/fontawesome-webfont.svg" : true,
    "/assets/fonts/font-awesome/fontawesome-webfont.ttf" : true,
    "/assets/fonts/font-awesome/fontawesome-webfont.woff" : true,
    "/assets/fonts/font-awesome/FontAwesome.otf" : true,
    "/assets/img/backgrounds/feature-bg.jpg" : true,
    "/assets/img/backgrounds/hero-bg.jpg" : true,
    "/assets/img/features/graph.png" : true,
    "/assets/img/features/iPhone.png" : true,
    "/assets/js/bootstrap.js" : true,
    "/assets/js/jquery-min.js" : true,
    "/assets/js/main.js" : true,
    "/assets/js/smooth-scroll.js" : true,
    "/assets/js/wow.js" : true
};

var site = "/node_app_slot";

function getContentType(filename)
{
    var i = filename.lastIndexOf('.');
    if (i < 0)  {
        return 'application/octet-stream';
    }
    return extensions[filename.substr(i+1).toLowerCase()] || 'application/octet-stream';
}

function pageNotFound(res)
{
    res.statusCode = 404;

    if(fs.existsSync(site + "/404.html")) {
        res.setHeader('content-type', "text/html");
        res.end(fs.readFileSync(site + "/404.html", {encoding: null}));
    }
    else {
        res.setHeader('content-type', "text/plain");
        res.end("The page at " + urlobj.pathname + " was not found.");
    }
}

function isSiteFile(filename)
{
    return files[filename];
}

function processGetState(req, res)
{
    // Sensors data
    console.log("State data request");

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/json');

    var currState = getCurrentState();

    res.end(JSON.stringify(
            {
                state       :   currState.comment,
                state_code  :   currState.value,
                bottle1     :   bottles[0].state.value,
                bottle2     :   bottles[1].state.value,
                bottle3     :   bottles[2].state.value,
                bottle4     :   bottles[3].state.value,
                bottle5     :   bottles[4].state.value,
                bottle6     :   bottles[5].state.value,
            }
        ));
}

function processIndex(req, res)
{
    // default page
    console.log("main page");

    if(!fs.existsSync(site + urlobj.pathname)) {
        console.log("main page not found");
        pageNotFound(res);
    }
    else {
        console.log("main page found");

        res.statusCode = 200;
        res.setHeader('content-type', getContentType(urlobj.pathname));

        res.end(fs.readFileSync(site + urlobj.pathname, {encoding: null}));
    }
}

function processGetCoctails(req, res)
{
    console.log("Process: get coctails");

    res.statusCode = 200;
    var coctailsViewData = [];
    for (var i = 0; i < coctails.length; ++i) {
        coctailsViewData.push({index: i, name: coctails[i].name});
    }

    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(coctailsViewData));
}

function processGetBottles(req, res)
{
    console.log("Process: get bottles");
    res.statusCode = 200;
    var bottlesViewData = [];
    for (var i = 0; i < bottles.length; ++i) {
        bottlesViewData.push({index: i+1, name: bottles[i].name});
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(bottlesViewData));
}
function requestHandler(req, res)
{
    console.log("Processing request");
    urlobj = url.parse(req.url, true);

    if (!isSiteFile(urlobj.pathname))  {
        console.log(urlobj.pathname + " is not site file");

        pageNotFound(res);
        return;
    }

    if (req.method === 'POST')  {
        handlePostRequest(req, res);
        return;
    }

    if (!urlobj.pathname || urlobj.pathname === '/') {
        // redirect to main page
        console.log("Redirect to main page");

        res.statusCode = 301;
        res.setHeader('Location', '/index.html');
        res.end();
    }
    else if(urlobj.pathname == "/index.html") {
        processIndex(req, res);
    }
    else if(urlobj.pathname === "/state") {
        processGetState(req, res);
    }
    else if (urlobj.pathname === "/getCoctails") {
        processGetCoctails(req, res);
    }
    else if (urlobj.pathname === "/getBottles") {
        processGetBottles(req, res);
    }
    else if(fs.existsSync(site + urlobj.pathname)) {
        // images, css, scripts
        console.log("File found");

        res.statusCode = 200;
        res.setHeader('content-type', getContentType(urlobj.pathname));
        res.end(fs.readFileSync(site + urlobj.pathname, {encoding: null}));
    }
    else {
        console.log("File not found");

        pageNotFound(res);
    }
}

var blinkState = true;

function showCurrentState()
{
    var timeout = 1000;
    switch(getCurrentState()) {
        case STATES.READY:
        break;

        case STATES.BUSY:
        break;

        case STATES.ERROR:
            blinkState = !blinkState;
            timeout = 200;
        break;
    }

    setTimeout(showCurrentState, timeout);
}

function handlePostRequest(req, res)
{
    console.log("POST " + urlobj.pathname);

    if(urlobj.pathname === "/makeCoctail") {
        var requestBody = "";
        console.log(urlobj.query);
        req.on('data', function(chunk) {
            console.log("Received body data: "+ chunk.toString());
            requestBody += chunk;
        });

        req.on('end', function() {
            var formData = qs.parse(requestBody);
            var coc_idx = parseInt(formData.coctail, 10);

            if ((coc_idx >= 0) && (coc_idx < coctails.length)) {
                makeCoctail(coc_idx);
            }
            else {
                console.log("Error: invalid coctail id: " + coc_idx);
            }

            res.statusCode = 200;
            var state = getCurrentState();
            res.end(JSON.stringify({state: state.comment, state_code: state.value}));
        });

    }
    else {
        pageNotFound(res);
    }
}

function getCurrentState()
{
    var currState = STATES.READY;

    for(var i = 0; i < bottles.length; ++i) {
        if(bottles[i].state === STATES.BUSY) {
            currState = STATES.BUSY;
        }
        else if (bottles[i].state === STATES.ERROR) {
            currState = STATES.ERROR;
        }
    }

    return currState;
}

var stepIdx = 0;
var cocIdx = 0;
function makeCoctail(coctailId)
{
    console.log("Starting making coctail: " + coctailId);

    if (getCurrentState() == STATES.READY) {
        cocIdx = coctailId;
        stepIdx = 0;
        doCoctailStep();
    }
    else {
        console.error("Barbot is busy. Please, wait until it finishes its work");
    }
}

function doCoctailStep()
{
    var step;
    var prevStep;
    var prevIdx;

    if((stepIdx === coctails[cocIdx].formula.length) && (stepIdx > 0)) {
        prevStep = coctails[cocIdx].formula[stepIdx-1];
        prevIdx = parseInt(prevStep.bottle);

        console.log("Close valve " + prevStep.bottle);

        closeValve(bottles[prevIdx-1].pinObj1, bottles[prevIdx-1].pinObj2);

        bottles[prevIdx-1].state = STATES.READY;
    }
    else if( (stepIdx >= 0) && (stepIdx < coctails[cocIdx].formula.length) ) {
        step = coctails[cocIdx].formula[stepIdx];
        var idx = -1;

        if(stepIdx > 0) {
            prevStep = coctails[cocIdx].formula[stepIdx-1];

            prevIdx = parseInt(prevStep.bottle);

            console.log("Close valve " + prevStep.bottle);

            closeValve(bottles[prevIdx-1].pinObj1, bottles[prevIdx-1].pinObj2);

            idx = prevIdx-1;

        }
        var curIdx = parseInt(step.bottle);

        var duration = mlToMs(step.volume);

        console.log("Open valve " + step.bottle + " for " + duration + " ms (" + step.volume + " ml)");

        openValve(bottles[curIdx-1].pinObj1, bottles[curIdx-1].pinObj2);

        bottles[curIdx-1].state = STATES.BUSY;

        if (idx !== -1) {
            bottles[idx].state = STATES.READY;
        }

        setTimeout(doCoctailStep, duration);

        stepIdx++;
    }
}

initBarbotConfiguration();

showCurrentState();

http.createServer(requestHandler).listen(port);
