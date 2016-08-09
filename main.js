/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
// Leave the above lines for propper jshinting
//Type Node.js Here :)

var address = '192.168.0.13';
var port    = 80;
var http    = require('http');
var url     = require('url');
var fs      = require('fs');
//var iotkit  = require('iotkit-comm');
//var dgram = require('dgram');
//var client = dgram.createSocket('udp4');


var mraa = require('mraa'); //require mraa
var urlobj;


var bottlePins =  [ new mraa.Gpio(2), new mraa.Gpio(4), new mraa.Gpio(6),
                    new mraa.Gpio(7), new mraa.Gpio(8), new mraa.Gpio(12) ];

var pinReady       = new mraa.Gpio(13);

function initPins()
{
    for(var i = 0; i < bottlePins.length; ++i)
    {
        bottlePins[i].dir(mraa.DIR_OUT);
    }
    pinReady.dir(mraa.DIR_OUT);
}


var STATES = {
    READY : {value: 1, name: "Ready",   comment: "Готов"},
    BUSY  : {value: 2, name: "Busy",    comment: "Готовлю коктейль. Подождите пожалуйста.." },
    ERROR : {value: 3, name: "Error",   comment: "Ошибка. Проверьте уровень жидкости в бутылке!" },
};

var bottleState = [ STATES.READY, STATES.READY, STATES.READY, 
                    STATES.READY, STATES.READY, STATES.READY ];
// Object
//  .table
//  .min
//  .max
/*
var tempTable       = {};
var lightTable      = {};
var pressTable      = {};
var soilHumTable    = {};
var airHumTable     = {};

var temp        = 0;
var ext_light   = 0;
var press       = 0;
var soil_hum    = 0;
var int_light   = 0;
var air_hum     = 0;
*/

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
"/"                 : true
, "/index.html"     : true
, "/favicon.ico"    : true
, "/state"          : true
, "/404.html"       : true 
, "/button_pressed.png"       : true     
, "/assets/css/app.css" : true
, "/assets/css/bootstrap.css" : true
, "/assets/css/main.css" : true
, "/assets/css/responsive.css" : true
, "/assets/extras/animate.css" : true
, "/assets/fonts/glyphicons-halflings-regular.eot" : true
, "/assets/fonts/glyphicons-halflings-regular.svg" : true
, "/assets/fonts/glyphicons-halflings-regular.ttf" : true
, "/assets/fonts/glyphicons-halflings-regular.woff" : true
, "/assets/fonts/font-awesome/font-awesome.min.css" : true
, "/assets/fonts/font-awesome/fontawesome-webfont.eot" : true
, "/assets/fonts/font-awesome/fontawesome-webfont.svg" : true
, "/assets/fonts/font-awesome/fontawesome-webfont.ttf" : true
, "/assets/fonts/font-awesome/fontawesome-webfont.woff" : true
, "/assets/fonts/font-awesome/FontAwesome.otf" : true
, "/assets/img/backgrounds/feature-bg.jpg" : true
, "/assets/img/backgrounds/hero-bg.jpg" : true
, "/assets/img/features/graph.png" : true
, "/assets/img/features/iPhone.png" : true
, "/assets/js/bootstrap.js" : true
, "/assets/js/jquery-min.js" : true
, "/assets/js/main.js" : true
, "/assets/js/smooth-scroll.js" : true
, "/assets/js/wow.js" : true};

var site = "/node_app_slot";

function getContentType(filename) 
{
    var i = filename.lastIndexOf('.');
    if (i < 0) 
    {
        return 'application/octet-stream';
    }
    return extensions[filename.substr(i+1).toLowerCase()] || 'application/octet-stream';
}

function pageNotFound(res)
{
    res.statusCode = 404;
    
    if(fs.existsSync(site + "/404.html"))
    {
        res.setHeader('content-type', "text/html");
        res.end(fs.readFileSync(site + "/404.html", {encoding: null}));
    }
    else
    {
        res.setHeader('content-type', "text/plain");
        res.end("The page at " + urlobj.pathname + " was not found.");        
    }
}

function isSiteFile(filename)
{
    return files[filename];
}


function requestHandler(req, res)
{
    urlobj = url.parse(req.url, true);
    //console.log("Request:" + urlobj.pathname);

    if (!isSiteFile(urlobj.pathname)) 
    {
        console.log(urlobj.pathname + " is not site file");
        
        pageNotFound(res);
        return;
    }

    if (req.method === 'POST') 
    {
        //handlePostRequest(req, res);
        return;
    }
    
    if (!urlobj.pathname || urlobj.pathname === '/')
    {
        // redirect to main page
        console.log("Redirect to main page");
        
        res.statusCode = 301;
        res.setHeader('Location', '/index.html');
        res.end();
    }
    else if(urlobj.pathname == "/index.html")
    {
        // default page
        console.log("main page");
        
        if(!fs.existsSync(site + urlobj.pathname))
        {
            console.log("main page not found");
            pageNotFound(res);
        }
        else
        {
            console.log("main page found");
            
            res.statusCode = 200;
            res.setHeader('content-type', getContentType(urlobj.pathname));
        
            res.end(fs.readFileSync(site + urlobj.pathname, {encoding: null}));
        }
        
        if(typeof urlobj.query !== 'undefined' && urlobj.query)
        {
            console.log(urlobj.query);
            
            if(isNumeric(urlobj.query.coctail))
            {
                var  coc_idx = urlobj.query.coctail;
                
                if((coc_idx >= 0) && (coc_idx < coctails.length))
                {
                    makeCoctail(coc_idx);
                }
            }
        }
    }

    else if(urlobj.pathname === "/state")
    {
        // Sensors data
        console.log("State data request");
        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/json');
    
        //console.log(currState.comment);
        
        var currState = getCurrentState();
        
        res.end(JSON.stringify(
                {   
                    state       :   currState.comment,
                    state_code  :   currState.value,
                    bottle1     :   bottleState[0].value,
                    bottle2     :   bottleState[1].value,                    
                    bottle3     :   bottleState[2].value,                    
                    bottle4     :   bottleState[3].value,
                    bottle5     :   bottleState[4].value,                    
                    bottle6     :   bottleState[5].value,                    
                }
            ));
    }
    else if(fs.existsSync(site + urlobj.pathname))
    {
        // images, css, scripts
        console.log("File found");
        
        res.statusCode = 200;
        res.setHeader('content-type', getContentType(urlobj.pathname));
        res.end(fs.readFileSync(site + urlobj.pathname, {encoding: null}));
    }
    else
    {
        console.log("File not found");
        
        pageNotFound(res);
    }
}

function isNumeric(n) 
{
  return !isNaN(parseFloat(n)) && isFinite(n);
}


var blinkState = true;

function showCurrentState()
{
    var timeout = 1000;
    switch(getCurrentState())
    {
        case STATES.READY:
            pinReady.write(1);
        break;
            
        case STATES.BUSY:
            pinReady.write(0);
        break;
            
        case STATES.ERROR:
            pinReady.write(blinkState ? 1 : 0);
            blinkState = !blinkState; 
            timeout = 200;
        break;
    }
    
    setTimeout(showCurrentState, timeout); 

}


function handlePostRequest(req, res)
{
    console.log("POST" + urlobj.pathname);
    console.log(urlobj.query);
  
    if(urlobj.pathname === "/do")
    {
        console.log( urlobj.query);
        
    }
    else
    {
        pageNotFound(res);
    }
        
}


var coctails = [];
function loadCoctails(filename)
{
    if(!fs.existsSync(filename))
    {
        console.log("Coctail file " + filename + " not found");        
    }
    else
    {
        
        var file = fs.readFileSync(filename);
        
        coctails = JSON.parse(file);
        
        console.log(coctails);
            
    }
    
}

function getCurrentState()
{
    var currState = STATES.READY;
        
    for(var i = 0; i < bottleState.length; ++i)
    {
        if(bottleState[i] === STATES.BUSY)       
        {
            currState = STATES.BUSY;        
        }
        else if (bottleState[i] === STATES.ERROR)
        {
            currState = STATES.ERROR;        
        }
    }
    
    return currState;
    
}

var stepIdx = 0;
var cocIdx = 0;
function makeCoctail(coctailId)
{
    if(getCurrentState() == STATES.READY)
    {
        cocIdx = coctailId;
        stepIdx = 0; 
        doCoctailStep();
    }
}

function doCoctailStep()
{
    var step;
    var prevStep;
    
    if((stepIdx === coctails[cocIdx].formula.length) && (stepIdx > 0))
    {
        prevStep = coctails[cocIdx].formula[stepIdx-1];
        bottlePins[parseInt(prevStep.bottle)-1].write(0);
        bottleState[parseInt(prevStep.bottle)-1] = STATES.READY;
        console.log ("Pin off " + prevStep.bottle);
    }
    else if( (stepIdx >= 0) && (stepIdx < coctails[cocIdx].formula.length) )
    {
        step = coctails[cocIdx].formula[stepIdx];
        var     idx = -1;
        
        if(stepIdx > 0)
        {
            prevStep = coctails[cocIdx].formula[stepIdx-1];
            
            bottlePins[parseInt(prevStep.bottle)-1].write(0);
            
            idx = parseInt(prevStep.bottle)-1;
            
            console.log ("Pin off " + prevStep.bottle);
        }
        console.log ("Pin on " + step.bottle + " for " + step.duration + " ms")
        bottlePins[parseInt(step.bottle)-1].write(1);
        bottleState[parseInt(step.bottle)-1] = STATES.BUSY;
        
        if(idx !== -1)
        {
            bottleState[idx] = STATES.READY;
        }
        
        setTimeout(doCoctailStep, step.duration);
                   
        stepIdx++;
    }
}

initPins();

showCurrentState();

loadCoctails(site + "/coctails.json");

var pinPWM       = new mraa.Pwm(3);
pinPWM.enable(true);
var state = 0;

//pinPWM.dir(mraa.DIR_OUT);


setTimeout(doPWM, 0);

function doPWM()
{
    pinPWM.write(state/100.0);
    
    state += 25;
    
    state = state % 100;
    
    setTimeout(doPWM, 3000);
}


//pinPWM.write(25);


http.createServer(requestHandler).listen(port, address);
