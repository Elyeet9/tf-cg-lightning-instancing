"use strict";

import * as pn from "./perlinnoise.js";
import * as cg from "./cg.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

//Cuando te mueves en X o Y se debe cambiar el offset
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
    DIRT: 0.3
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

//Replace to what texture will return according to the height [-1; 1]
function GetHSLColor(v){
    var regType = GetRegionType(v);
    switch (regType){
        case "WATER":
            return 'hsl(202,50%,50%)';
        case "SAND":
            return 'hsl(47,80%,72%)';
        case "GRASS":
            return 'hsl(129, 55%, 58%)';
        case "DIRT":
            return 'hsl(36, 28%, 49%)';
    }
    return 'hsl(202,50%,50%)';
}

async function main(){
    // GenerateMap();
    // function render(elaspedTime){
    //     //Para obtener el valor de una pos en el perlin noise
    //     //let value = perlinNoise.get(x, y);
    //     //Con ello se situa la altura de los bloques mientras uno avanza
    //     GenerateMap();
    //     console.log("JIJI   ");
    //     requestAnimationFrame(render);
    // }
    // requestAnimationFrame(render);



    const gl = document.querySelector("#canvitas").getContext("webgl2");
    if (!gl) return undefined !== console.log("WebGL 2.0 not supported");

    twgl.setDefaults({ attribPrefix: "a_" });

    const vertSrc = await fetch("glsl/tp-cg.vert").then((r) => r.text());
    const fragSrc = await fetch("glsl/tp-cg.frag").then((r) => r.text());
    const meshProgramInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
    const floor = await cg.loadObj(
        "models/crate/crate.obj",
        gl,
        meshProgramInfo,
    );

    const cam = new cg.Cam([0, -5, 25], 100);

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

        let x = 0, y = 0;
        for (let i = -16; i < 16; i += 2) {
            x = 0;
            for (let j = -16; j < 16; j += 2) {
                m4.identity(uniforms.u_world);
                m4.translate(uniforms.u_world, uniforms.u_world, [i, parseInt(perlinNoise.get(x + offSetX, y + offSetY) * 20), j]);
                twgl.setUniforms(meshProgramInfo, uniforms);

                for (const { bufferInfo, vao, material } of floor) {
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
        /**/ if (e.key === "w") cam.processKeyboard(cg.FORWARD, deltaTime);
        else if (e.key === "a") cam.processKeyboard(cg.LEFT, deltaTime);
        else if (e.key === "s") cam.processKeyboard(cg.BACKWARD, deltaTime);
        else if (e.key === "d") cam.processKeyboard(cg.RIGHT, deltaTime);
    });
    document.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
    document.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
    document.addEventListener("mouseup", () => cam.stopMove());
    document.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
}

function GenerateMap(){
    var xtot, ytot;
    for (let y = 0; y < grid_size; y += num_pixels / grid_size){
        for (let x = 0; x < grid_size; x += num_pixels / grid_size){  

            perlinNoise.get(x, y);
        }
    }
}

main();