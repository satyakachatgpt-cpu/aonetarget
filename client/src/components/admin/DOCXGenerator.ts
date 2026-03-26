export const generateDOCX = async (questions: any[], format: string = 'default', fileName: string = 'Paper.docx') => {
  try {
    const response = await fetch('/api/generate-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions, title: fileName.split('.')[0] })
    });

    if (!response.ok) throw new Error('Generation failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download failed:', err);
    alert('Failed to generate real DOCX. Please ensure backend is updated.');
  }
};
