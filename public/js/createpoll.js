// Add a new option box

function addOption() {
    var options = document.getElementsByTagName('input');
    var form = document.getElementById('poll-info');

    // Construct the new label element
    var newLabel = document.createElement('Label');
    newLabel.setAttribute('for', 'option ' + options.length);
    newLabel.setAttribute('class', 'col-sm-2 control-label');
    newLabel.innerHTML = "Option " + options.length;

    // Construct the new div element
    var newDiv = document.createElement('Div');
    newDiv.setAttribute('class', 'col-sm-10');

    // Construct the new input element
    var newInput = document.createElement('Input');
    newInput.setAttribute('type', 'text');
    newInput.setAttribute('class', 'form-control');
    newInput.setAttribute('name', 'option_' + options.length);

    // Add the new elements to the document
    newDiv.appendChild(newInput);
    form.appendChild(newLabel);
    form.appendChild(newDiv);
}
