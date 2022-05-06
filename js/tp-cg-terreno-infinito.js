"use strict";

import * as pn from "./perlinnoise.js";
import * as cg from "./cg.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

var offSetX = 0;
var offSetY = 0;

const grid_size = 1;
const resolution = 16;
const num_pixels = grid_size / resolution; // 0.25
const perlinNoise = new pn.PerlinNoise();

const RegionType = {
    WATER: -1,
    SAND: 0,
    GRASS: 0.06,
    STONE: 0.3
}

function GetRegionType(v){
    var regType;
    for (let key in RegionType){
        if (v >= RegionType[key]){
            regType = key;
        }
    }
    return regType;
}

async function main(){
    const gl = document.querySelector("#canvitas").getContext("webgl2");
    if (!gl) return undefined !== console.log("WebGL 2.0 not supported");

    twgl.setDefaults({ attribPrefix: "a_" });

    const vertSrc = await fetch("glsl/tp-cg.vert").then((r) => r.text());
    const fragSrc = await fetch("glsl/tp-cg.frag").then((r) => r.text());
    const meshProgramInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
    const waterObj = await cg.loadObj(
        "models/water/water.obj",
        gl,
        meshProgramInfo,
    );
    const sandObj = await cg.loadObj(
        "models/sand/sand.obj",
        gl,
        meshProgramInfo,
    );
    const grassObj = await cg.loadObj(
        "models/grass/grass.obj",
        gl,
        meshProgramInfo,
    );
    const stoneObj = await cg.loadObj(
        "models/stone/stone.obj",
        gl,
        meshProgramInfo,
    );

    const cam = new cg.Cam([0, 18, 35], 100);

    let aspect = 1;
    let deltaTime = 0;
    let lastTime = 0;
    let theta = 0;

    const uniforms = {
        u_world: m4.create(),
        u_projection: m4.create(),
        u_view: cam.viewM4,
    };

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    function GetObjectToUse(v){
        var regType = GetRegionType(v);
        switch (regType){
            case "WATER":
                return waterObj;
            case "SAND":
                return sandObj;
            case "GRASS":
                return grassObj;
            case "STONE":
                return stoneObj;
        }
        return waterObj;
    }

    function render(elapsedTime) {
        elapsedTime *= 1e-3;
        deltaTime = elapsedTime - lastTime;
        lastTime = elapsedTime;

        if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            aspect = gl.canvas.width / gl.canvas.height;
        }
        gl.clearColor(0.1, 0.1, 0.1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        theta = elapsedTime;

        m4.identity(uniforms.u_projection);
        m4.perspective(uniforms.u_projection, cam.zoom, aspect, 0.1, 100);

        gl.useProgram(meshProgramInfo.program);

        let x = 0, y = 0, v;
        for (let i = -56; i < 56; i += 2) {
            x = 0;
            for (let j = -56; j < 56; j += 2) {
                v = perlinNoise.get(x + offSetX, y + offSetY);

                m4.identity(uniforms.u_world);
                m4.translate(uniforms.u_world, uniforms.u_world, [i, parseInt(v * 20), j]);
                twgl.setUniforms(meshProgramInfo, uniforms);

                var objectToUse = GetObjectToUse(v);
                for (const { bufferInfo, vao, material } of objectToUse) {
                    gl.bindVertexArray(vao);
                    twgl.setUniforms(meshProgramInfo, {}, material);
                    twgl.drawBufferInfo(gl, bufferInfo);
                }
                x += num_pixels / grid_size
            }
            y += num_pixels / grid_size;

        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    document.addEventListener("keydown", (e) => {
        /**/ if (e.key === "w") offSetX -= num_pixels;
        else if (e.key === "a") offSetY -= num_pixels;
        else if (e.key === "s") offSetX += num_pixels;
        else if (e.key === "d") offSetY += num_pixels;
        else if(e.key === "q") cam.moveUpDown(1, deltaTime);
        else if(e.key === "e") cam.moveUpDown(-1, deltaTime);
    });
    document.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
    document.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
    document.addEventListener("mouseup", () => cam.stopMove());
    document.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
}

main();