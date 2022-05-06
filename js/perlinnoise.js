

class PerlinNoise{
    constructor(height, width, scale){
        this.height = height;
        this.width = width;
        this.scale = scale;
        this.offSetX = Math.random(0, 99999);
        this.offSetY = Math.random(0, 99999);
    }

    GenerateMap(height, width, scale){
        let map = [];
        this.height = height;
        this.width = width;
        this.scale = scale;
        for(let x = 0; x < height; x++){
            for(let y = 0; y < width; y++){
                var noise = PerlinNoiseAlgorithm(x, y);
                map[x][y] = noise;
            }
        }
        return map;
    }
    
    PerlinNoiseAlgorithm(x, y){
        var xCoord = x / this.width * scale + offSetX;
        var yCoord = y / this.height * scale + offSetY;
    
        var sample = Math.PerlinNoise(xCoord, yCoord);
        return sample;
    }
}




