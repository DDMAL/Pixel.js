export class Wand
{
    constructor ()
    {
        //this.type =
        this.baseLayer = null;
        this.maskLayer = null;
        this.waitClass = null; //css class for when background is loading
        this.drawClass = null; //css class for when add mode is off
        this.addClass = null; //css for add mode is on
        this.colourThreshold = 15;
        this.blurRadius = 5;
        this.resetLayerOnDeactivate = false;
        this._snapshot = null;
        this._history = null;
        this._isDivaConnect = false;
        this._allowDraw = false;
        this._addMode = false;
        this._currentThreshold = 0;
        this._downPoint = null;
        this._oldImage = null;
    }

    initializeWand ()
    {
        this._currentThreshold = this.colourThreshold;

        if (this.baseLayer)
        {
            this.setLayer(this.baseLayer);
        }

        this.history = new MaskHistory();
    }

    destroyWand ()
    {
        this.onDeactivate;
    }

    setColourThreshold (threshold)
    {
        this.currentThreshold = this.colourThreshold = threshold;
    }

    setBlurRadius (radius)
    {
        this.blurRadius = radius;
    }

    getLayer ()
    {
        return this.baseLayer;
    }

    setLayer (layer)
    {
        this.baseLayer = layer.isBaseLayer ? null : layer;
        if (this.active)
        {
            this.clearImage();
            this.createSnapshot();
        }
    }

    clearImage ()
    {
        if (this.maskLayer && this.maskLayer.tile)
        {
            this.maskLayer.tile.clearImage();
        }
    }

    connectToMaskLayer ()
    {
        this.maskLayer.events.on({
            'createtile': this.onCreateMaskTile,
            scope: this
        });
    }

    disconnectFromMaskLayer ()
    {
        this.maskLayer.events.un({
            'createtile': this.onCreateMaskTile,
            scope: this
        });
    }

    onCreateMaskTile (e)
    {
        if (this.history)
            this.history.clear();
    }

    connectToBackground ()
    {

    }
}

class MaskHistory
{

}
