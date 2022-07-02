"use strict";

import * as pn from "./perlinnoise.js";
import * as cg from "./cg.js";
import * as v3 from "./glmjs/vec3.js";
import * as v4 from "./glmjs/vec4.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

var offSetX = 0;
var offSetY = 0;

const grid_size = 1;
const resolution = 16;
const num_pixels = grid_size / resolution; // 0.0625
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

    let vertSrc = await fetch("glsl/flashlight.vert").then((r) => r.text());
    let fragSrc = await fetch("glsl/flashlight.frag").then((r) => r.text());
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


    vertSrc = await fetch("glsl/slime.vert").then((r) => r.text());
    fragSrc = await fetch("glsl/slime.frag").then((r) => r.text());
    const slimeProgramInfo = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
    
    const cam = new cg.Cam([0, 18, 20], 20);

    let aspect = 16.0/9.0;
    let deltaTime = 0;
    let lastTime = 0;
    
    const initial_light_pos = v3.fromValues(20, 15, 20);
    const origin = v4.create();
    const light_position = v3.create();

    const world = m4.create();
    const projection = m4.create();

    const coords = {
        u_world: world,
        u_projection: projection,
        u_view: cam.viewM4,
    };

    const fragUniforms = {
		u_ambientLight: new Float32Array([0.1, 0.1, 0.1]),
		u_lightPosition: new Float32Array([0.0, 0.0, 0.0]),
		u_viewPosition: cam.pos,
	};

    const flashlight = {
        "u_light.ambient": new Float32Array([0.25, 0.25, 0.25]),
        "u_light.diffuse": new Float32Array([1.0, 1.0, 1.0]),
        "u_light.intensity": 10,
        "u_light.cutOff": Math.cos(Math.PI / 15.0),
        "u_light.outerCutOff": Math.cos(Math.PI / 12.0),
        "u_light.direction": cam.lookAt,
        "u_light.position": cam.pos,
        "u_light.constant": 1.0,
        "u_light.linear": 0.09,
        "u_light.quadratic": 0.002,
        u_viewPosition: cam.pos,
    };

    const numObjs = 50000;
    const positions = new Array(numObjs);
    const rndb = (a, b) => parseInt(Math.random() * (b - a) + a);
    for (let i = 0; i < numObjs; i++) {
    positions[i] = [
        rndb(-64.0, 64.0),
        rndb(25.0, 60.0),
        rndb(-64.0, 64.0),
    ];
    }

    const slime_light = {
        "u_light.type": 3,
        "u_light.ambient": new Float32Array([0.01, 0.01, 0.01]),
        "u_light.diffuse": new Float32Array([1.0, 1.0, 1.0]),
        "u_light.intensity": 1.0,
        "u_light.position": v3.fromValues(20.0, 5.0, 20.0),
        u_viewPosition: cam.pos,
    };

    const transforms = new Float32Array(numObjs * 16);
    const infoInstances = new Array(numObjs);

    for (let i = 0; i < numObjs; i++) {
        infoInstances[i] = {
            transform: transforms.subarray(i * 16, i * 16 + 16),
        }

        slime_light["u_light.position"] = positions[i];
        m4.identity(infoInstances[i].transform);
        m4.translate(infoInstances[i].transform, infoInstances[i].transform, positions[i]);
        const scale = Math.random() * 0.33 + 0.1;
		m4.scale(infoInstances[i].transform, infoInstances[i].transform, [scale, scale, scale],);

    }
    
    const cubex = await cg.loadObj(
        "models/slime/slime.obj",
        gl,
        slimeProgramInfo,
        transforms,
      );

    function MoveAllSlimes(x, z){
        for(let i=0; i < numObjs; i++){
            positions[i][0] += z;
            positions[i][2] += x;
        }
    }

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
        
        gl.clearColor(0.69, 0.80, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        m4.identity(world);
        m4.translate(world, world, initial_light_pos);
        v3.transformMat4(light_position, origin, world);

        m4.identity(projection);
        m4.perspective(projection, cam.zoom, aspect, 0.1, 100);

        gl.useProgram(meshProgramInfo.program);
        twgl.setUniforms(meshProgramInfo, flashlight);

        //ground
        let x = 0, y = 0, v;
        for (let i = -64; i < 64; i += 2) {
            x = 0;
            for (let j = -64; j < 64; j += 2) {
                v = perlinNoise.get(x + offSetX, y + offSetY);

                m4.identity(world);
                m4.translate(world, world, [i, parseInt(v*20), j]);
                twgl.setUniforms(meshProgramInfo, coords);

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


        //slimes (hay errores para poner luz a los slimes, se quedan negros por alguna razon)
        //el problema creo que es porque le estoy pasando coords a los uniforms
        //deberia ser con el slime_light, pero si le pongo eso ya no se grafican los slimes
        // No leo lloros ~
            gl.useProgram(slimeProgramInfo.program)
            m4.identity(coords.u_world);

            twgl.setUniforms(slimeProgramInfo, coords);
            twgl.setUniforms(slimeProgramInfo, fragUniforms);
            for (const { bufferInfo, vertexArrayInfo, vao, material } of cubex) {
              gl.bindVertexArray(vao);
              gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.a_transform.buffer);
              gl.bufferSubData(gl.ARRAY_BUFFER, 0, transforms),
              twgl.setUniforms(slimeProgramInfo, {}, material);  
              twgl.drawBufferInfo(gl, vertexArrayInfo, gl.TRIANGLES, vertexArrayInfo.numElements, 0, numObjs,);
            }


        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    document.addEventListener("keydown", (e) => {
        if (e.key === "w" || e.key === "W"){
            var MoveOffsetX = cam.getOffsetX(cg.FORWARD, deltaTime);
            var MoveOffsetZ = cam.getOffsetY(cg.FORWARD, deltaTime);
            offSetX += MoveOffsetX/40;
            offSetY += MoveOffsetZ/40;
            MoveAllSlimes(-MoveOffsetX, - MoveOffsetZ);
        }
        else if (e.key === "a" || e.key === "A"){
            var MoveOffsetX = cam.getOffsetX(cg.LEFT, deltaTime);
            var MoveOffsetZ = cam.getOffsetY(cg.LEFT, deltaTime);
            offSetX += MoveOffsetX/40;
            offSetY += MoveOffsetZ/40;
            MoveAllSlimes(-MoveOffsetX, - MoveOffsetZ);
            
        }
        else if (e.key === "s" || e.key === "S"){
            var MoveOffsetX = cam.getOffsetX(cg.BACKWARD, deltaTime);
            var MoveOffsetZ = cam.getOffsetY(cg.BACKWARD, deltaTime);
            offSetX += MoveOffsetX/40;
            offSetY += MoveOffsetZ/40;
            MoveAllSlimes(-MoveOffsetX, - MoveOffsetZ);
            
        }
        else if (e.key === "d" || e.key === "D"){
            var MoveOffsetX = cam.getOffsetX(cg.RIGHT, deltaTime);
            var MoveOffsetZ = cam.getOffsetY(cg.RIGHT, deltaTime);
            offSetX += MoveOffsetX/40;
            offSetY += MoveOffsetZ/40;
            MoveAllSlimes(-MoveOffsetX, - MoveOffsetZ);
            
        }
        else if(e.key === "q" || e.key === "Q") cam.moveUpDown(-1, deltaTime)/40;
        else if(e.key === "e" || e.key === "E") cam.moveUpDown(1, deltaTime)/40;
    });
    
    document.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
    document.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
    document.addEventListener("mouseup", () => cam.stopMove());
    document.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
}

main();