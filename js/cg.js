"use strict";

import * as vec3 from "./glmjs/vec3.js";
import * as mat4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

const FORWARD = 0;
const LEFT = 1;
const BACKWARD = 2;
const RIGHT = 3;

const MINZOOM = Math.PI / 180.0;
const MAXZOOM = Math.PI / 4.0;
const MAXPITCH = Math.PI / 2.02;

class Cam {
  constructor(pos, speed = 2.5) {
    this.pos = vec3.clone(pos);
    this.up = vec3.clone([0, 1, 0]);
    this.lookAt = vec3.create();
    this.right = vec3.create();
    this.worldUp = vec3.clone([0, 1, 0]);

    this.yaw = -Math.PI / 2.0;
    this.pitch = 0.0;
    this.zoom = Math.PI / 4.0;

    this.mouseSensitivity = 0.001;
    this.zoomSensitivity = 0.0005;

    this.speed = speed;

    this.mouseMove = false;
    this.lastX = 0;
    this.lastY = 0;

    this.viewM4 = mat4.create();

    this.sign = [1, -1, -1, 1];
    this.vec = [this.lookAt, this.right, this.lookAt, this.right];
    this.temp = vec3.create();

    this.updateVectors();
  }
  startMove(xpos, ypos) {
    this.lastX = xpos;
    this.lastY = ypos;
    this.mouseMove = true;
  }
  stopMove() {
    this.mouseMove = false;
  }
  movePov(xpos, ypos) {
    if (this.mouseMove) {
      this.processPov(xpos - this.lastX, this.lastY - ypos);
      this.lastX = xpos;
      this.lastY = ypos;
    }
  }
  stopPov() {
    this.firstMouse = true;
  }
  processKeyboard(direction, deltaTime) {
    const velocity = this.sign[direction] * this.speed * deltaTime;
    this.pos[0] += this.vec[direction][0] * velocity;
    this.pos[1] += this.vec[direction][1] * velocity;
    this.pos[2] += this.vec[direction][2] * velocity;
    this.updateVectors(); // missing before!
  }
  processScroll(yoffset) {
    this.zoom -= yoffset * this.zoomSensitivity;
    if (this.zoom < MINZOOM) {
      this.zoom = MINZOOM;
    } else if (this.zoom > MAXZOOM) {
      this.zoom = MAXZOOM;
    }
  }
  processPov(xoffset, yoffset, constrainPitch) {
    constrainPitch = constrainPitch === undefined ? true : constrainPitch;
    this.yaw += xoffset * this.mouseSensitivity;
    this.pitch += yoffset * this.mouseSensitivity;
    if (constrainPitch) {
      if (this.pitch > MAXPITCH) this.pitch = MAXPITCH;
      else if (this.pitch < -MAXPITCH) this.pitch = -MAXPITCH;
    }
    this.updateVectors();
  }
  updateVectors() {
    this.lookAt[0] = Math.cos(this.yaw) * Math.cos(this.pitch);
    this.lookAt[1] = Math.sin(this.pitch);
    this.lookAt[2] = Math.sin(this.yaw) * Math.cos(this.pitch);
    vec3.normalize(this.lookAt, this.lookAt);
    vec3.cross(this.right, this.lookAt, this.worldUp);
    vec3.normalize(this.right, this.right);
    vec3.cross(this.up, this.right, this.lookAt);
    vec3.normalize(this.up, this.up);

    vec3.add(this.temp, this.pos, this.lookAt);
    mat4.lookAt(this.viewM4, this.pos, this.temp, this.up);
  }
}

class Mesh {
  constructor(gl, shader, params) {
    this.gl = gl;
    this.vertices = params.vertices;
    this.indices = params.indices;
    this.vao = gl.createVertexArray();

    const vbo = gl.createBuffer();
    const ebo = gl.createBuffer();

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    let stride = 0;
    for (const a of params.attribs) stride += a.size;
    stride *= 4;
    let offset = 0;
    for (const a of params.attribs) {
      const attrib = gl.getAttribLocation(shader, a.name);
      gl.enableVertexAttribArray(attrib);
      gl.vertexAttribPointer(attrib, a.size, gl.FLOAT, false, stride, offset);
      offset += a.size * 4;
    }

    gl.bindVertexArray(null);
  }
  draw(lines = false) {
    this.gl.bindVertexArray(this.vao);
    this.gl.drawElements(
      lines === true ? this.gl.LINE_STRIP : this.gl.TRIANGLES,
      this.indices.length,
      this.gl.UNSIGNED_INT,
      0,
    );
    this.gl.bindVertexArray(null);
  }
}

class MeshHelper {
  constructor(numVertices, numComps, numIndices) {
    this.numComps = numComps;
    this.vertices = new Float32Array(numVertices * numComps);
    this.indices = new Uint32Array(numIndices);
    this.iv = 0;
    this.ii = 0;
  }
  addVertex(comps) {
    for (let i = 0; i < comps.length; ++i) {
      this.vertices[this.iv * this.numComps + i] = comps[i];
    }
    this.iv++;
  }
  addTriangle(a, b, c) {
    this.indices[this.ii * 3 + 0] = a;
    this.indices[this.ii * 3 + 1] = b;
    this.indices[this.ii * 3 + 2] = c;
    this.ii++;
  }
  addRect(a, b, c, d) {
    this.addTriangle(a, b, c);
    this.addTriangle(b, c, d);
  }
}

function parseObj(text) {
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];
  const objColors = [[0, 0, 0]];

  const objVertexData = [objPositions, objTexcoords, objNormals, objColors];
  let webglVertexData = [[], [], [], []];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ["default"];
  let material = "default";
  let object = "default";

  const noop = () => {};

  function newGeometry() {
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      const color = [];
      webglVertexData = [position, texcoord, normal, color];
      geometry = {
        object,
        groups,
        material,
        data: { position, texcoord, normal, color },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split("/");
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) return;
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
      if (i === 0 && objColors.length > 1) {
        geometry.data.color.push(...objColors[index]);
      }
    });
  }

  const keywords = {
    v(parts) {
      if (parts.length > 3) {
        objPositions.push(parts.slice(0, 3).map(parseFloat));
        objColors.push(parts.slice(3).map(parseFloat));
      } else {
        objPositions.push(parts.map(parseFloat));
      }
    },
    vn: (parts) => objNormals.push(parts.map(parseFloat)),
    vt: (parts) => objTexcoords.push(parts.map(parseFloat)),
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,
    mtllib: (_, uargs) => materialLibs.push(uargs),
    usemtl(_, uargs) {
      material = uargs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(_, uargs) {
      object = uargs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");

  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = keywordRE.exec(line);
    if (!m) continue;
    const [, keyword, uargs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn("unhandled keyword:", keyword);
      continue;
    }
    handler(parts, uargs);
  }

  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
      Object.entries(geometry.data).filter(([, array]) => array.length > 0),
    );
  }

  return {
    geometries,
    materialLibs,
  };
}

function parseMapArgs(uargs) {
  return uargs;
}

function parseMtl(text) {
  const materials = {};
  let material;

  const keywords = {
    newmtl: (_, uargs) => materials[uargs] = material = {},
    Ns: (parts) => material.shininess = parseFloat(parts[0]),
    Ka: (parts) => material.ambient = parts.map(parseFloat),
    Kd: (parts) => material.diffuse = parts.map(parseFloat),
    Ks: (parts) => material.specular = parts.map(parseFloat),
    Ke: (parts) => material.emissive = parts.map(parseFloat),
    map_Kd: (_, uargs) => material.diffuseMap = parseMapArgs(uargs),
    map_Ns: (_, uargs) => material.specularMap = parseMapArgs(uargs),
    map_Bump: (_, uargs) => material.normalMap = parseMapArgs(uargs),
    Ni: (parts) => material.opticalDensity = parseFloat(parts[0]),
    d: (parts) => material.opacity = parseFloat(parts[0]),
    illum: (parts) => material.illum = parseInt(parts[0]),
  };
  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) continue;
    const m = keywordRE.exec(line);
    if (!m) continue;
    const [, keyword, uargs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn(`unhandled keyword (${lineNo}): ${keyword}`);
      continue;
    }
    handler(parts, uargs);
  }

  return materials;
}

async function fetchText(fn) {
  const resp = await fetch(fn);
  return await resp.text();
}

async function loadObj(fn, gl, meshProgramInfo, transforms) {
  const objText = await fetchText(fn);
  const obj = parseObj(objText);

  const baseHref = new URL(fn, window.location.href);
  const matTexts = await Promise.all(obj.materialLibs.map(async (filename) => {
    const matHref = new URL(filename, baseHref).href;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const materials = parseMtl(matTexts.join("\n"));
  const textures = {
    defaultWhite: twgl.createTexture(gl, { src: [255, 255, 255, 255] }),
  };
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = new URL(filename, baseHref).href;
          texture = twgl.createTexture(gl, { src: textureHref, flipY: true });
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }
  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    shininess: 400,
    opacity: 1,
  };
  const parts = obj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }
    if (transforms) {
      Object.assign(data, {
        transform: {
          numComponents: 16,
          data: transforms,
          drawType: gl.DYNAMIC_DRAW,
          divisor: 1,
        },
      });
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);

    const vertexArrayInfo = transforms
      ? twgl.createVertexArrayInfo(gl, meshProgramInfo, bufferInfo)
      : null;
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
      vertexArrayInfo,
      vao,
    };
  });
  return parts;
}

export {
  BACKWARD,
  Cam,
  fetchText,
  FORWARD,
  LEFT,
  loadObj,
  Mesh,
  MeshHelper,
  RIGHT,
};
