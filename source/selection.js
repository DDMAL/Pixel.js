/*jshint esversion: 6 */
export class Selection {
    constructor() {
        this.layer = null;
        this.selectedShapes = [];
        this.type = "selection";
        this.imageDataList = [];
    }

    copyShape(maxZoomLevel) {
        this.imageDataList = [];
        this.selectedShapes.forEach((shape) => {
            this.layer.removeShapeFromLayer(shape);
            this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());

            let scaleRatio = Math.pow(2, maxZoomLevel);

            // Get coordinates of the selection shape (a rectangle here)
            let absoluteRectOriginX = shape.origin.relativeOriginX * scaleRatio,
                absoluteRectOriginY = shape.origin.relativeOriginY * scaleRatio,
                absoluteRectWidth = shape.relativeRectWidth * scaleRatio,
                absoluteRectHeight = shape.relativeRectHeight * scaleRatio;

            let xmin = Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth),
                ymin = Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

            let selectedLayerCtx = this.layer.getCanvas().getContext("2d");
            let imageData = selectedLayerCtx.getImageData(xmin, ymin, Math.abs(absoluteRectWidth), Math.abs(absoluteRectHeight));

            this.imageDataList.push(imageData);

            shape.changeBlendModeTo("add");
        });
    }

    cutShape(maxZoomLevel) {
        this.imageDataList = [];
        this.selectedShapes.forEach((shape) => {
            this.layer.removeShapeFromLayer(shape);
            this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());

            let scaleRatio = Math.pow(2, maxZoomLevel);

            // Get coordinates of the selection shape (a rectangle here)
            let absoluteRectOriginX = shape.origin.relativeOriginX * scaleRatio,
                absoluteRectOriginY = shape.origin.relativeOriginY * scaleRatio,
                absoluteRectWidth = shape.relativeRectWidth * scaleRatio,
                absoluteRectHeight = shape.relativeRectHeight * scaleRatio;

            let xmin = Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth),
                ymin = Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

            let selectedLayerCtx = this.layer.getCanvas().getContext("2d");
            let imageData = selectedLayerCtx.getImageData(xmin, ymin, Math.abs(absoluteRectWidth), Math.abs(absoluteRectHeight));

            this.imageDataList.push(imageData);

            shape.changeBlendModeTo("subtract");
            this.layer.addShapeToLayer(shape);
            this.layer.drawLayer(maxZoomLevel, this.layer.getCanvas());
        });
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
        let scaleRatio = Math.pow(2, zoomLevel);

        this.selectedShapes.forEach((shape, index) => {
            // Get coordinates of the selection shape (a rectangle here)
            let absoluteRectOriginX = shape.origin.relativeOriginX * scaleRatio,
                absoluteRectOriginY = shape.origin.relativeOriginY * scaleRatio,
                absoluteRectWidth = shape.relativeRectWidth * scaleRatio,
                absoluteRectHeight = shape.relativeRectHeight * scaleRatio;

            let xmin = Math.min(absoluteRectOriginX, absoluteRectOriginX + absoluteRectWidth);
            let ymin = Math.min(absoluteRectOriginY, absoluteRectOriginY + absoluteRectHeight);

            let pasteCanvas = document.createElement("canvas");
            pasteCanvas.width = Math.abs(absoluteRectWidth);
            pasteCanvas.height = Math.abs(absoluteRectHeight);

            pasteCanvas.getContext("2d").putImageData(this.imageDataList[index], 0, 0);

            canvas.getContext("2d").drawImage(pasteCanvas, xmin, ymin);
        });
    }
}
