/**
 * Created by zeyadsaleh on 2017-08-14.
 */
export class Tutorial
{
    constructor (pixelInstance)
    {
        this.pixelInstance = pixelInstance;
        this.currentTutorialPageIndex = 0;
        this.modalContent = document.createElement('div');
        this.createTutorial();
    }

    createTutorial ()
    {
        let overlay = document.createElement('div');
        overlay.setAttribute("id", "tutorial-div");

        let background = document.createElement('div');
        background.setAttribute("id", "tutorial-overlay");

        let modal = document.createElement('div');
        modal.setAttribute("id", "myModal");
        modal.setAttribute("class", "modal");

        this.modalContent.setAttribute("class", "modal-content");

        let modalHeader = document.createElement('div');
        modalHeader.setAttribute("class", "modal-header");

        let text = document.createTextNode("Tutorial");
        let h2 = document.createElement('h2');
        h2.appendChild(text);

        let closeModal = document.createElement('span');
        closeModal.setAttribute("class", "close");
        closeModal.innerHTML = "&times;";

        let modalBody = this.getModalBody(this.currentTutorialPageIndex);

        let modalFooter = document.createElement('div');
        modalFooter.setAttribute("class", "modal-footer");
        modalFooter.setAttribute("id", "modal-footer");

        let close = document.createElement('h2');
        close.innerHTML = "Got It!";

        modal.appendChild(this.modalContent);
        this.modalContent.appendChild(modalHeader);
        this.modalContent.appendChild(modalBody);
        this.modalContent.appendChild(modalFooter);
        modalHeader.appendChild(h2);
        modalHeader.appendChild(closeModal);
        modalFooter.appendChild(close);

        overlay.appendChild(background);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.style.display = "block";

        modalFooter.addEventListener("click", () =>
        {
            overlay.parentNode.removeChild(overlay);
        });
    }

    getModalBody (tutorialPageIndex)
    {
        let modalBody = document.createElement('div');
        modalBody.setAttribute("class", "modal-body");
        modalBody.setAttribute("id", "modal-body");

        let tutorialP = document.createElement('p');
        let img = new Image();
        img.className = "tutorial-image";
        let next = document.createElement("button");
        next.innerHTML = "next";
        let previous = document.createElement("button");
        previous.innerHTML = "previous";
        next.addEventListener("click", () =>
        {
            this.currentTutorialPageIndex ++;
            this.getTutorialPage(this.currentTutorialPageIndex);
        });
        previous.addEventListener("click", () =>
        {
            this.currentTutorialPageIndex --;
            this.getTutorialPage(this.currentTutorialPageIndex);
        });

        switch (tutorialPageIndex)
        {
            case 0:
                tutorialP.innerHTML = "Navigate to the page you would like to edit and start Pixel.js. 4 views will appear: a general toolbox, layers view, tools view and import/export";
                img.src = "https://media.giphy.com/media/aL9oQ0f1sDIpq/giphy.gif";
                break;
            case 1:
                tutorialP.innerHTML = "You can start by creating a layer for every class you have. The layer's colour is indicated in a colour box next to the layer's name in the layer's view";
                img.src = "https://media.giphy.com/media/rBiuWy5YUsIow/giphy.gif";
                break;
            case 2:
                tutorialP.innerHTML = "You can upload images to the currently selected layer";
                img.src = "https://media.giphy.com/media/Qy4u6oHru8OpG/giphy.gif";
                break;
            case 3:
                tutorialP.innerHTML = "Double click on the layer's name to rename it";
                img.src = "https://media.giphy.com/media/LRxzQa1ogqKAw/giphy.gif";
                break;
            case 4:
                tutorialP.innerHTML = "Use zoom along with the grab tool <kbd>g</kbd> to navigate a page";
                img.src = "https://media.giphy.com/media/hcLjZ9dFHOKDm/giphy.gif";
                break;
            case 5:
                tutorialP.innerHTML = "Use the select tool <kbd>s</kbd> to copy <kbd>Ctrl</kbd> + <kbd>c</kbd> /cut <kbd>Ctrl</kbd> + <kbd>x</kbd> and paste <kbd>Ctrl</kbd> + <kbd>v</kbd> rectangular regions of pixels from one layer to another";
                img.src = "https://media.giphy.com/media/ruMD98axGjdyE/giphy.gif";
                break;
            case 6:
                tutorialP.innerHTML = "Right click and drag right and left on the erase <kbd>e</kbd> and brush <kbd>b</kbd> tools to change the brush size";
                img.src = "https://media.giphy.com/media/NhvALG9MhGYta/giphy.gif";
                break;
            case 7:
                tutorialP.innerHTML = "Press shift and drag on the erase <kbd>e</kbd> and brush <kbd>b</kbd> tools to draw straight lines";
                img.src = "https://media.giphy.com/media/t74TeR1gd9aaA/giphy.gif";
                break;
            case 8:
                tutorialP.innerHTML = "Right click and drag on rectangle tool <kbd>r</kbd> to erase rectangular regions, left click to draw rectangle";
                img.src = "https://media.giphy.com/media/i497rUNYB8t32/giphy.gif";
                break;
            case 9:
                tutorialP.innerHTML = "Use the Fullscreen mode <kbd>f</kbd> and the browser zoom to get more precision when needed";
                img.src = "https://media.giphy.com/media/FkzOAenUJxfGg/giphy.gif";
                break;
            case 10:
                tutorialP.innerHTML = "You can bring a layer forward/backward";
                img.src = "https://media.giphy.com/media/DImPhyGZ3OltC/giphy.gif";
                break;
            case 11:
                tutorialP.innerHTML = "You can undo <kbd>Ctrl</kbd> + <kbd>z</kbd> and redo <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>z</kbd>  fffan action";
                img.src = "https://media.giphy.com/media/24kHpWLzbHFrq/giphy.gif";
                break;
            case 12:
                tutorialP.innerHTML = "You can delete layers using <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>del</kbd>";
                img.src = "https://media.giphy.com/media/cmQesBkeEvdmM/giphy.gif";
                break;
            case 13:
                tutorialP.innerHTML = "You can mute <kbd>m</kbd> or hide <kbd>h</kbd> layers";
                img.src = "https://media.giphy.com/media/BhVXr7ONVdStq/giphy.gif";
                break;
            case 14:
                tutorialP.innerHTML = "You can change the opacity of a layer";
                img.src = "https://media.giphy.com/media/94EtnDoG2yNAQ/giphy.gif";
                break;
            case 15:
                tutorialP.innerHTML = "Export layers as PNGs";
                img.src = "https://media.giphy.com/media/kBAau6Gebio7e/giphy.gif";
                break;

            // let hotkeyGlossary = document.createElement('ul');
            // hotkeyGlossary.setAttribute("style", "list-style-type:none;");
            //
            // let LayerSelect = document.createElement('li');
            // LayerSelect.innerHTML = "<kbd>1</kbd> ... <kbd>9</kbd> layer select";
            //
            // let brushTool = document.createElement('li');
            // brushTool.innerHTML = "<kbd>b</kbd> brush tool";
            //
            // let rectangleTool = document.createElement('li');
            // rectangleTool.innerHTML = "<kbd>r</kbd> rectangle tool";
            //
            // let grabTool = document.createElement('li');
            // grabTool.innerHTML = "<kbd>g</kbd> grab tool";
            //
            // let eraserTool = document.createElement('li');
            // eraserTool.innerHTML = "<kbd>e</kbd> eraser tool";
            //
            // let shift = document.createElement('li');
            // shift.innerHTML = "<kbd>Shift</kbd>  force tools to paint in an exact way.";
            //
            // let undo = document.createElement('li');
            // undo.innerHTML = "<kbd>cmd</kbd> + <kbd>z</kbd> undo";
            //
            // let redo = document.createElement('li');
            // redo.innerHTML = "<kbd>cmd</kbd> + <kbd>Shift</kbd> + <kbd>z</kbd> redo";
        }

        modalBody.appendChild(img);
        modalBody.appendChild(tutorialP);
        if (this.currentTutorialPageIndex !== 0)
            modalBody.appendChild(previous);
        if (this.currentTutorialPageIndex !== 15)
            modalBody.appendChild(next);

        return modalBody;
    }

    getTutorialPage (pageIndex)
    {
        let modalBody = document.getElementById("modal-body");
        modalBody.parentElement.removeChild(modalBody);

        this.modalContent.insertBefore(this.getModalBody(pageIndex), document.getElementById("modal-footer"));
    }
}