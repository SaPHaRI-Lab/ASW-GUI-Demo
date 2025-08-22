// Utility to upload participant design data to the legacy-compatible /upload-csv endpoint
// Usage: import uploadDesign and call it with the required arguments from your React component

export interface UploadDesignParams {
  participantNum: string;
  videoNum: string;
  csvData: string | Blob;
  keystrokeData: string | Blob;
  guiImage1: Blob;
  guiImage2: Blob;
}

export async function uploadDesign({
  participantNum,
  videoNum,
  csvData,
  keystrokeData,
  guiImage1,
  guiImage2,
}: UploadDesignParams): Promise<{ success: boolean; id?: number; error?: string }> {
  const formData = new FormData();
  formData.append('participant_num', participantNum);
  formData.append('video_num', videoNum);

  // Ensure correct file types and names for legacy compatibility
  const csvFile =
    csvData instanceof Blob
      ? new File([csvData], `Participant_${participantNum}_Design_${videoNum}.csv`, { type: 'text/csv' })
      : new File([csvData], `Participant_${participantNum}_Design_${videoNum}.csv`, { type: 'text/csv' });
  formData.append('csv_file', csvFile);

  const keystrokeFile =
    keystrokeData instanceof Blob
      ? new File([keystrokeData], `KEYSTROKES_Participant_${participantNum}_Design_${videoNum}.csv`, { type: 'text/csv' })
      : new File([keystrokeData], `KEYSTROKES_Participant_${participantNum}_Design_${videoNum}.csv`, { type: 'text/csv' });
  formData.append('keystroke_file', keystrokeFile);

  formData.append('gui_image1', guiImage1, `GUI1_Participant_${participantNum}_Design_${videoNum}.png`);
  formData.append('gui_image2', guiImage2, `GUI2_Participant_${participantNum}_Design_${videoNum}.png`);

  try {
    const response = await fetch('/upload-csv', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
