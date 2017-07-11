export class Tile_Mask
{
    constructor ()
    {
        this.canvasMask = null;
        this.canvasContext = null;
        this.image = null;
        this._border = null;
        this._hatchInterval = null;
        this._hatchOffset = 0;
    }

    initializeMask (layer, position, size, options)
    {
        //call diva instance
        this.createCanvas();
        if (position)
            this.setPosition(position);
        if (size)
            this.setCanvasSize(size);

        var selection = this;
        if (this.layer.hatchTimeout && this.layer.hatchTimeout > 0)
            this.hatchInterval = setInterval(function () {selection.hatchTick(); }, this.layer.hatchTimeout);

    }

    destroyMask ()
    {
        if (this.hatchInterval)
            clearInterval(this.hatchInterval);

        if (this.canvasMask)
        {
            this.clear();
        }
        this.destroyCanvas(); //check back here
    }

    setBounds (bounds)
    {
        // do nothing
    }

    shouldDraw ()
    {
        return true;
    }

    draw ()
    {
        return this.drawBorder();
    }

    hatchTick ()
    {
        this.hatchOffset = (this.hatchOffset + 1) % (this.layer.hatchLength * 2);
        return this.drawBorder(true);
    }

    setCanvasSize (size)
    {
        this.canvasContext.canvas.width = size.w;
        this.canvasContext.canvas.height = size.h;

        this.size = size;
    }

    clear ()
    {
        if (this.canvasMask)
        {
            if (this.canvasMask.parentNode === this.layer.div)
            {
                this.layer.div.removeChild(this.canvasMask);
            }
            this.canvasMask = null;
        }
        this.canvasContext = null;
    }

    createCanvas ()
    {
        this.canvasMask = document.createElement("canvas");
        this.layer.div.appendChild(this.canvasMask);

        this.canvasContext = this.canvasMask.getContext("2d");

        this.className = "divaTileMask";

        let style = this.canvasMask.style;
        if (this.layer.opacity < 1)
        {
            style.filter = 'alpha(opacity=' + (this.layer.opacity * 100) + ')';
        }
        style.position = "absolute";
    }

    clearImage ()
    {
        this.image = null;
        this.border = null;
        if (this.canvasContext)
        {
            this.canvasContext.clearRect(0, 0, this.size.w, this.size.h);
        }
    }

    setImage (image)
    {
        this.image = image;
        this.drawBorder();
    }

    drawBorder (noBorder)
    {
        if (!this.image)
            return false;

        let i, j, k, q, len,
            w = this.size.w, // viewport size
            h = this.size.h,
            ix = this.size.w - 1, // right bottom of viewport (left top = [0,0])
            iy = this.size.h - 1,
            sw = this.size.w + 2, // extend viewport size (+1 px on each side)
            sh = this.size.h + 2;

        if (!noBorder)
        { // need create border

            var dx, dy, x0, y0, x1, y1, k1, k2,
                rx0, rx1, ry0, ry1, // result of the intersection image with the viewport (+1 px on each side)
                img = this.image.data,
                w1 = this.image.width,
                b = this.image.bounds,
                of = this.image.globalOffset, // image offset in the viewport basis,
                data = new Uint8Array(sw * sh), // viewport data (+1 px on each side) for correct detection border
                minPx = Math.round(this.layer.map.minPx.x),
                minPy = Math.round(this.layer.map.minPx.y),
                maxPx = Math.round(this.layer.map.maxPx.x),
                pxLen = maxPx - minPx, // width in pixels of the one world
                offset,
                offsets = [{ // all posible world offsets in the viewport basis (considering wrapDateLine)
                    x: -minPx,
                    y: -minPy
                }, { // add left world
                    x: -(minPx - pxLen),
                    y: -minPy
                }, { // add right world
                    x: -(minPx + pxLen),
                    y: -minPy
                }];

            // walk through all worlds
            var offsetsLen = offsets.length;
            for (j = 0; j < offsetsLen; j++)
            {
                offset = offsets[j]; // world offset in the viewport basis
                dx = of.x - offset.x; // delta for the transformation in viewport basis
                dy = of.y - offset.y;
                x0 = dx + b.minX; // left top of image (in viewport basis)
                y0 = dy + b.minY;
                x1 = dx + b.maxX; // right bottom of image (in viewport basis)
                y1 = dy + b.maxY;

                // intersection of the image with viewport
                if (!(x1 < 0 || x0 > ix || y1 < 0 || y0 > iy))
                {
                    rx0 = x0 > -1 ? x0 : -1; // intersection +1 px on each side (for search border)
                    ry0 = y0 > -1 ? y0 : -1;
                    rx1 = x1 < ix + 1 ? x1 : ix + 1;
                    ry1 = y1 < iy + 1 ? y1 : iy + 1;
                } else
                {
                    continue;
                }
                // copy result of the intersection(+1 px on each side) to mask data for detection border
                len = rx1 - rx0 + 1;
                i = (ry0 + 1) * sw + (rx0 + 1);
                k1 = (ry0 - dy) * w1 + (rx0 - dx);
                k2 = (ry1 - dy) * w1 + (rx0 - dx) + 1;
                // walk through rows (Y)
                for (k = k1; k < k2; k += w1)
                {
                    // walk through cols (X)
                    for (q = 0; q < len; q++)
                    {
                        if (img[k + q] === 1)
                            data[i + q] = 1; // copy only "black" points
                    }
                    i += sw;
                }
            }

            // save result of border detection for animation
            this.border = MagicWand.getBorderIndices({ data: data, width: sw, height: sh });
        }

        this.canvasContext.clearRect(0, 0, w, h);

        var ind = this.border; // array of indices of the boundary points
        if (!ind)
            return false;

        var x, y,
            imgData = this.canvasContext.createImageData(w, h), // result image
            res = imgData.data,
            hatchLength = this.layer.hatchLength,
            hatchLength2 = hatchLength * 2,
            hatchOffset = this.hatchOffset;

        len = ind.length;

        for (j = 0; j < len; j++)
        {
            i = ind[j],
                x = i % sw; // calc x by index
            y = (i - x) / sw; // calc y by index
            x -= 1; // viewport coordinates transformed from extend (+1 px) viewport
            y -= 1;
            if (x < 0 || x > ix || y < 0 || y > iy)
                continue;
            k = (y * w + x) * 4; // result image index by viewport coordinates

            if ((x + y + hatchOffset) % hatchLength2 < hatchLength)
            { // detect hatch color
                res[k + 3] = 255; // black, change only alpha
            }
            else
            {
                res[k] = 255; // white
                res[k + 1] = 255;
                res[k + 2] = 255;
                res[k + 3] = 255;
            }
        }

        this.canvasContext.putImageData(imgData, 0, 0);

        return true;
    }

    getContours (filter)
    {
        if (!this.image)
            return null;

        var i, j, points, len, plen, c,
            image = this.image,
            dx = image.globalOffset.x + Math.round(this.layer.map.minPx.x),
            dy = image.globalOffset.y + Math.round(this.layer.map.minPx.y),
            contours = MagicWand.traceContours(image),
            result = [];

        if (this.layer.simplifyTolerant > 0) contours = MagicWand.simplifyContours(contours, this.layer.simplifyTolerant, this.layer.simplifyCount);
        len = contours.length;
        for (i = 0; i < len; i++) {
            c = contours[i];
            points = c.points;
            plen = points.length;
            c.initialCount = c.initialCount || plen;
            if (filter && filter(c) === false) continue;
            for (j = 0; j < plen; j++) {
                points[j].x += dx;
                points[j].y += dy;
            }
            result.push(contours[i]);
        }
        return result;
    }
}

export class Layer_Mask
{
    constructor ()
    {
        this.alwaysInRange = true;
        this.title = null;
        this.hatchLength = 4;
        this.hatchTimeout = 300;
        this.simplifyTolerant = 1;
        this.simplifyCount = 30;
        this.resolution = null;
    }

    destroy ()
    {
        if (this.tile)
        {
            this.tile.destroy();
            this.tile = null;
        }
        //OpenLayers.Layer.prototype.destroy.call(this);
    }

    moveTo (bounds, zoomChanged, dragging)
    {

    }
}
