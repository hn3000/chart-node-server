import * as c from 'canvas';
import * as express from 'express';
import * as path from 'path';

import { renderPie, renderTimeline } from './painter-d3';

function run(argv) {
  console.log("starting express");
  let app = express();

  app.use(express.json());

  app.get("/", function(req, res) {
    res.sendFile("index.html", { root: path.resolve(__dirname, '../assets') });
  });
  app.get("/help-me/", function(req, res) {
    res.sendFile("form.html", { root: path.resolve(__dirname, '../assets') });
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
        `listening, try http://localhost:${port}/ or http://${host}:${port}/`
      );
    }
  });
}

/** @param res: express.Request */
function createImage(painter, [writer, type], req, res) {
  //console.log(req.path, req.params, req.body);
  let { width = 1920, height = 1080, background } = req.body.chart;
  let canvas = new c.Canvas(width, height, type);
  if (null != background) {
    let context = canvas.getContext("2d");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  painter(req, canvas);
  writer(canvas, res);
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

run(process.argv);
