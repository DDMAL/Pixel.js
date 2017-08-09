class PixelException
{
    constructor (message)
    {
        this.message = message;
    }
}

export class CannotDeleteLayerException extends PixelException {}
