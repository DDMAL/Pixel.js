import { CompoundShape } from "./compound-shape";

/*jshint esversion: 6 */
export class Selection {
    constructor() {
        this.layer = null;
        this.selectedShapes = [];
        this.imageDataList = [];
        this.type = "selection";
    }

    copySelection(maxZoomLevel) {
        this.imageDataList = [];
        this.selectedShapes.forEach((shape) => {
            this._copyImageData(shape, maxZoomLevel);
            this.layer.removeShapeFromLayer(shape);
            shape.changeBlendModeTo("add");
        });
    }

    cutSelection(maxZoomLevel) {
        this.imageDataList = [];
        this.selectedShapes.forEach((shape) => {
            this._copyImageData(shape, maxZoomLevel);
            shape.changeBlendModeTo("subtract");
        });

        this.layer.addShapeToLayer(new CompoundShape(...this.selectedShapes));
        this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());
    }

    /**
     * Must redraw layer after calling
     * @param layerToPasteTo
     * @param maxZoomLevel
     */
    pasteShapeToLayer(layerToPasteTo) {
        this.imageDataList.forEach(({ data }) => {
            // Change imageData colour to layer's colour
            for (let i = 0; i < data.length; i += 4) {
                data[i] = layerToPasteTo.colour.red;             // red
                data[i + 1] = layerToPasteTo.colour.green;       // green
                data[i + 2] = layerToPasteTo.colour.blue;        // blue
            }
        });

        layerToPasteTo.addToPastedRegions(this);
    }

    setLayer(layer) {
        this.layer = layer;
    }

    addSelectedShape(shape) {
        this.selectedShapes.push(shape);
    }

    removeSelectedShape(shape) {
        const index = this.selectedShapes.indexOf(shape);
        if (index > -1) {
            this.selectedShapes.splice(index, 1);
        }
    }

    clearSelection(maxZoomLevel) {
        if (this.layer !== null) {
            this.selectedShapes.forEach((shape) => {
                if (shape.blendMode === "select") {
                    this.layer.removeShapeFromLayer(shape);
                }
            });
            this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());
        }
    }

    drawOnPage(layer, pageIndex, zoomLevel, renderer, canvas) {
        this.selectedShapes.forEach((shape, index) => {
            // Get coordinates of the selection shape (a rectangle here)
            let { x, y, absoluteRectWidth, absoluteRectHeight } = this._getBoundingDimensions(shape, zoomLevel);

            let pasteCanvas = document.createElement("canvas");
            pasteCanvas.width = Math.abs(absoluteRectWidth);
            pasteCanvas.height = Math.abs(absoluteRectHeight);

            pasteCanvas.getContext("2d").putImageData(this.imageDataList[index], 0, 0);

            canvas.getContext("2d").drawImage(pasteCanvas, x, y);
        });
    }

    _copyImageData(shape, maxZoomLevel) {
        this.layer.removeShapeFromLayer(shape);
        this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());

        // Get coordinates of the selection shape (a rectangle here)
        let { x, y, absoluteRectWidth, absoluteRectHeight } = this._getBoundingDimensions(shape, maxZoomLevel);

        let selectedLayerCtx = this.layer.getCanvas().getContext("2d");
        let imageData = selectedLayerCtx.getImageData(x, y, Math.abs(absoluteRectWidth), Math.abs(absoluteRectHeight));

        this.imageDataList.push(imageData);
    }

    _getBoundingDimensions(shape, zoomLevel) {
        let scaleRatio = Math.pow(2, zoomLevel);

        // Get coordinates of the selection shape (a rectangle here)
        let absoluteRectOriginX = shape.origin.relativeOriginX * scaleRatio,
            absoluteRectOriginY = shape.origin.relativeOriginY * scaleRatio,
            absoluteRectWidth = shape.relativeRectWidth * scaleRatio,
            absoluteRectHeight = shape.relativeRectHeight * scaleRatio;

        let x = Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth),
            y = Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

        return { x, y, absoluteRectWidth, absoluteRectHeight };
    }
}
