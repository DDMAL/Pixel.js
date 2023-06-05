export class CompoundShape {
    constructor(...shapes) {
        this.shapes = shapes;
        this.type = "shape";
    }

    drawOnPage(layer, pageIndex, zoomLevel, renderer, canvas) {
        this.shapes.forEach((shape) => {
            shape.drawOnPage(layer, pageIndex, zoomLevel, renderer, canvas);
        });
    }
}