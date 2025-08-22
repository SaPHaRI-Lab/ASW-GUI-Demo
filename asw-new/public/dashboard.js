async function fetchFiles() {
    const response = await fetch("/files");
    const json = await response.json();
    let fileList = "<table border='1'><tr><th>Participant #</th><th>Video #</th><th>File Name</th><th>GUI1</th><th>GUI2</th><th>Keystrokes</th><th>Timestamp</th><th>Actions</th></tr>";
    for (let i = 0; i < json.length; i++) {
        fileList += `<tr><td>${json[i].participant_num}</td><td>${json[i].video_num}</td><td>${json[i].file_name}</td><td><button onclick="downloadFile('${json[i].id}', 1)">Download</button></td><td><button onclick="downloadFile('${json[i].id}', 2)">Download</button></td>
        <td><button onclick="downloadFile('${json[i].id}', 'keystrokes_${json[i].file_name}')">Download</button></td><td>${json[i].timestamp}</td><td><button onclick="downloadFile('${json[i].id}', '${json[i].file_name}')">Download</button><button onclick="deleteFile('${json[i].id}', '${json[i].file_name}')">Delete</button></td></tr>`
    }
    fileList += "</table>";
    document.getElementById("fileList").innerHTML = fileList;
}

async function downloadFile(fileID, fileName) {
    let response, downloadName;
    if (fileName != 1 && fileName != 2) {
        if (fileName.startsWith('keystrokes')) {
            response = await fetch(`/download-keystrokes/${fileID}`);
            downloadName = fileName;
        } else {
            response = await fetch(`/download/${fileID}`);
            downloadName = fileName;
        }
    } else {
        response = await fetch(`/download-image/${fileID}/${fileName}`);
        downloadName = `GUI${fileName}`;
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function deleteFile(fileID) {
    const response = await fetch(`/delete/${fileID}`, {method: "DELETE"});
    const result = await response.json();
    alert(result.message);
    fetchFiles();
}

window.onload = fetchFiles;
