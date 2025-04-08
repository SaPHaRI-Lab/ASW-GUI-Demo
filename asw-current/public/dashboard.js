async function fetchFiles() {
    const response = await fetch("http://localhost:3000/files");//("http://xxx.xx.xxx.xx:3000/files");
    const json = await response.json();
    let fileList = "<table border='1'><tr><th>Participant #</th><th>Video #</th><th>File Name</th><th>Timestamp</th><th>Actions</th></tr>";
    for (let i = 0; i < json.length; i++) {
        fileList += `<tr><td>${json[i].participant_num}</td><td>${json[i].video_num}</td><td>${json[i].file_name}</td><td>${json[i].timestamp}</td>
        <td><button onclick="downloadFile('${json[i].id}', '${json[i].file_name}')">Download</button><button onclick="deleteFile('${json[i].id}', '${json[i].file_name}')">Delete</button></td>
        </tr>`
    }
    fileList += "</table>";
    document.getElementById("fileList").innerHTML = fileList;
}

async function downloadFile(fileID, fileName) {
    const response = await fetch(`/download/${fileID}`);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function deleteFile(fileID) {//needs refresh
    const response = await fetch(`/delete/${fileID}`, {method: "DELETE"});
    const result = await response.json();
    alert(result.message);
    fetchFiles();
}

window.onload = fetchFiles;