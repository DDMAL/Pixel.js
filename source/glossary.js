/* jshint esversion: 6 */

export class Glossary
{
    constructor (pixelInstance)
    {
        this.pixelInstance = pixelInstance;
        this.currentTutorialPageIndex = 0;
        this.modalContent = document.createElement('div');
        this.createGlossary();
    }

    createGlossary ()
    {
        let overlay = document.createElement('div');
        overlay.setAttribute("id", "glossary-div");

        let background = document.createElement('div');
        background.setAttribute("id", "glossary-overlay");

        let modal = document.createElement('div');
        modal.setAttribute("id", "myModal");
        modal.setAttribute("class", "modal");

        this.modalContent.setAttribute("class", "modal-content");

        let modalHeader = document.createElement('div');
        modalHeader.setAttribute("class", "modal-header");

        let text = document.createTextNode("Keyboard Shortcuts");
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

    getModalBody ()
    {
        //this.getTutorialPage(this.currentTutorialPageIndex);

        let modalBody = document.createElement('div');
        modalBody.setAttribute("class", "modal-body");
        modalBody.setAttribute("id", "modal-body");

        let glossaryP = document.createElement('p');
        glossaryP.innerHTML = "The following is a glossary of the hotkeys you will find useful when using Pixel.js";


        let hotkeyGlossary = document.createElement('ul');
        hotkeyGlossary.setAttribute("style", "list-style-type:none;");

        let layerSelect = document.createElement('li');
        layerSelect.innerHTML = "<kbd>1</kbd> ... <kbd>9</kbd> layer select";

        let brushTool = document.createElement('li');
        brushTool.innerHTML = "<kbd>b</kbd> brush tool";

        let rectangleTool = document.createElement('li');
        rectangleTool.innerHTML = "<kbd>r</kbd> rectangle tool";

        let grabTool = document.createElement('li');
        grabTool.innerHTML = "<kbd>g</kbd> grab tool";

        let eraserTool = document.createElement('li');
        eraserTool.innerHTML = "<kbd>e</kbd> eraser tool";

        let shift = document.createElement('li');
        shift.innerHTML = "<kbd>Shift</kbd> force tools to paint in an exact way.";

        let undo = document.createElement('li');
        undo.innerHTML = "<kbd>cmd</kbd> + <kbd>z</kbd> undo";

        let redo = document.createElement('li');
        redo.innerHTML = "<kbd>cmd</kbd> + <kbd>Shift</kbd> + <kbd>z</kbd> redo";

        hotkeyGlossary.appendChild(layerSelect);
        hotkeyGlossary.appendChild(brushTool);
        hotkeyGlossary.appendChild(rectangleTool);
        hotkeyGlossary.appendChild(grabTool);
        hotkeyGlossary.appendChild(eraserTool);
        hotkeyGlossary.appendChild(shift);
        hotkeyGlossary.appendChild(undo);
        hotkeyGlossary.appendChild(redo);

        modalBody.appendChild(glossaryP);
        modalBody.appendChild(hotkeyGlossary);
        //modalBody.appendChild(layerSelect);

        return modalBody;
    }

    getTutorialPage (pageIndex)
    {
        let modalBody = document.getElementById("modal-body");
        modalBody.parentElement.removeChild(modalBody);

        this.modalContent.insertBefore(this.getModalBody(pageIndex), document.getElementById("modal-footer"));
    }
}