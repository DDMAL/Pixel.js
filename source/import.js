import {Colour} from './colour';
import {Point} from './point';

export class Import {
    constructor(pixelInstance, layers, pageIndex, zoomLevel, uiManager) {
        this.pixelInstance = pixelInstance;
        this.layers = layers;
        this.exportInterrupted = false;
        this.pageIndex = pageIndex;
        this.zoomLevel = zoomLevel;
        this.matrix = null;
        this.uiManager = uiManager;
    }

    /**
     * Creates a PNG for each layer where the pixels spanned by the layers are replaced by the actual image data
     * of the Diva page
     */
    uploadLayerPNGToCanvas(layer, e)
    {
        // 1. Upload the image to a new canvas
        let ctx = layer.getCanvas().getContext("2d");

        let reader = new FileReader();

        reader.onload = (event) =>
        {
            let img = new Image();
            img.onload = () =>
            {
                ctx.drawImage(img,0,0);

                let imageData = ctx.getImageData(0, 0, layer.getCanvas().width, layer.getCanvas().height);
                let data = imageData.data;

                for(let i = 0; i < data.length; i += 4)
                {
                    // red
                    data[i] = layer.colour.red;
                    // green
                    data[i + 1] = layer.colour.green;
                    // blue
                    data[i + 2] = layer.colour.blue;
                }
                // overwrite original image
                ctx.putImageData(imageData, 0, 0);
            };
            img.src = event.target.result;
        };

        reader.readAsDataURL(e.target.files[0]);
    }
}