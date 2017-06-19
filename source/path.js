export class Path
{
    constructor (brushSize, blendMode)
    {
        this.points = [];
        this.brushSize = brushSize;
        this.type = "path";
        this.blendMode = blendMode;
    }

    addPointToPath (point)
    {
        this.points.push(point);
    }

    draw ()
    {

    }
}