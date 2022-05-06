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
    GenerateMap();
    function render(elaspedTime){
        //Para obtener el valor de una pos en el perlin noise
        //let value = perlinNoise.get(x, y);
        //Con ello se situa la altura de los bloques mientras uno avanza

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function GenerateMap(){
    for (let y = 0; y < grid_size; y += num_pixels / grid_size){
        for (let x = 0; x < grid_size; x += num_pixels / grid_size){  
            perlinNoise.get(x, y);
        }
    }
}

main();