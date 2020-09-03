import * as c from 'canvas';
import * as express from 'express';
import * as path from 'path';

import { renderPie, renderTimeline } from './painter-d3';
import { UnitFactorsDefault, dimension, dimensionProxy } from './dimension';
import { box, position } from './position';
import { parseBoolean } from './util';

function runServer(argv) {
  console.log("starting express");
  let app = express();

  app.use(express.json());

  app.get("/", function(req, res) {
    res.sendFile("index.html", { root: path.resolve(__dirname, '../assets') });
  });
  app.get("/help-me/example/:json", function(req, res) {
    //console.log(`GET ${req.params.json}`);
    res.sendFile(req.params.json, { root: path.resolve(__dirname, '../example') });
  });
  app.get("/help-me/", function(req, res) {
    if (req.originalUrl.endsWith('/')) {
      res.sendFile("form.html", { root: path.resolve(__dirname, '../assets') });
    } else {
      res.setHeader('Location', '/help-me/');
      res.sendStatus(301);
    }
  });

  const styles = {
    pie: renderPie,
    timeline: renderTimeline,
  };
  const formats = {
    pdf: [writePDF, 'pdf'],
    svg: [writeSVG, 'svg'],
    png: [writePNG, 'image'],
    jpg: [writeJPEG, 'image'],
    jpeg: [writeJPEG, 'image']
  };

  app.post("/:style/:format/", function(req, res) {
    const style = styles[req.params.style];
    const format = formats[req.params.format];

    if (style && format) {
      createImage(style, format, req, res);
    } else {
      res.sendStatus(404);
      console.log("not found: ", req.path, req.params);
    }
  });

  let { HOST = "::0", PORT = 3456 } = process.env;
  let r = app.listen(+PORT, HOST);

  r.once("listening", function() {
    const a = r.address();
    console.log("address: ", a);
    if (typeof a === 'string') {
      console.log(
        `listening, address: ${a}`
      );
    } else {
      let port = a.port;
      let host = a.address;
      console.log(
        `listening, try http://localhost:${port}/help-me/ or http://${host}:${port}/help-me/`
      );
    }
  });
}

const WATERMARK = parseBoolean(process.env.WATERMARK);

/** @param res: express.Request */
function createImage(painter, [writer, type], req, res) {
  const start = Date.now();
  //console.log(req.path, req.params, req.body);
  let { background, watermark } = req.body.chart;
  let { width, height } = dimensionProxy(req.body.chart, { width: 1920, height: 1080 });
  const w = width.value();
  const h = height.value();
  const area = w * h;
  if (w < 0 || h < 0 || area > 15e6) {
    res.sendStatus(400, `illegal size`);
  } else {
    let canvas = new c.Canvas(width.value(), height.value(), type);
    const ctx = canvas.getContext('2d');
    ctx.save();
    if (null != background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width.value(), height.value() );
      ctx.restore();
      ctx.save();
    }
  
    const env0 = { 
      vh: height.value()/100, 
      vw: width.value() / 100, 
      vmin: Math.min(height.value(), width.value()) / 100, 
      vmax: Math.max(height.value(), width.value()) / 100,
      ...UnitFactorsDefault
    };
  
    painter(req, canvas, env0);
    maybeRenderWatermark(req, canvas, watermark, width, height, env0);
    writer(canvas, res);
  }
  res.on('close', () => {
    console.log(`responded in ${Date.now() - start}ms`);
  });
}

function maybeRenderWatermark(req, canvas, watermark, width, height, env0) {
  if (WATERMARK || watermark) {
    console.debug(`rendering watermark, WATERMARK = ${WATERMARK} (${typeof WATERMARK})`);
    const ctx = canvas.getContext('2d');
    let i = 0;
    try {
      for (i = 0; i < 100; ++i) {
        ctx.restore();
      }
    } catch(e) {
      console.log(`exception trying to restore (${i})`, e);
    }
    ctx.resetTransform();
    
    const defConfig = { 
      fontSize: '3vmin'
    };
    let wmConfig = defConfig as any;
    if (typeof watermark === 'object') {
      wmConfig = watermark;
    }
    const config = dimensionProxy(wmConfig, defConfig, () => env0);

    const { fontSize } = config;
    const { 
      fontFamily = 'Courier,fixed', 
      fillStyle = (typeof watermark === 'string') ? watermark : '#678'
    } = wmConfig;
    
    ctx.fillStyle = fillStyle;
    const font =  `${fontSize.value()}px ${fontFamily}`;
    console.log(font);
    ctx.font = font;
    const url = `${req.protocol}://${req.get('Host')}${req.originalUrl}`;

    const env1 = { ...env0, em: fontSize.value() };
    const wmbox = box(position(0,0), position(width, height)).resolve(env1).insideBox('1em');
    const pos = wmbox.bottomLeft();
    console.log('bottom left', pos.x(), pos.y(), dimension('1em').value(env1));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(url, pos.x(), pos.y(), wmbox.width());
  }
}

function writePNG(canvas, res) {
  let stream = canvas.createPNGStream();
  res.type("png");
  stream.pipe(
    res,
    { end: true }
  );
}

function writeJPEG(canvas: c.Canvas, res) {
  let stream = canvas.createJPEGStream();
  res.type("jpeg");
  stream.pipe(
    res,
    { end: true }
  );
}

function writePDF(canvas: c.Canvas, res) {
  let stream = canvas.createPDFStream();
  res.type("pdf");
  stream.pipe(
    res,
    { end: true }
  );
}

function writeSVG(canvas: c.Canvas, res) {
  let buffer = canvas.toBuffer();
  res.type("svg");

  console.log(buffer.toString());
  res.send(buffer);
}

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (numCPUs == 1) {
  runServer(process.argv);
} else {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is starting ${numCPUs} worker${numCPUs == 1 ? '' : 's'}`);
  
    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
  
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    runServer(process.argv);
  }
}
