export const generateCSVTemplate = (type) => {
    let headers = '';
    let rows = [];

    switch (type) {
        case 'class':
            headers = 'Name,Division';
            rows = ['10,A', '10,B', '9,A'];
            break;
        case 'mentor':
            headers = 'Name,Email,Password,AssignedClasses';
            rows = [
                'John Doe,john@example.com,password123,10-A',
                'Jane Smith,jane@example.com,securepass,10-B; 9-A'
            ];
            break;
        case 'student':
            headers = 'Name,RegisterNo,UID,Gender,Status,ClassName,Division';
            rows = ['Alice Name,REG001,UID123,Female,Active,10,A', 'Bob Name,REG002,,Male,Active,10,B'];
            break;
        default:
            return null;
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_upload_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const parseCSV = (file, type) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target.result.replace(/^\uFEFF/, '');
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length < 2) {
                reject("File appears empty or only contains headers.");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const result = [];

            for (let i = 1; i < lines.length; i++) {
                // Split and handle potential quote issues (simple split for now, but robust to count)
                // We'll treat the header count as the source of truth
                let values = lines[i].split(',').map(v => v.trim());

                // Fix mismatches
                if (values.length > headers.length) {
                    // Try to remove trailing empty strings (common with Excel exports)
                    while (values.length > headers.length && values[values.length - 1] === '') {
                        values.pop();
                    }
                }

                // If still mismatch, we can either skip or try to fit. 
                // Let's just create an entry for what we have.

                const entry = {};
                headers.forEach((header, index) => {
                    entry[header] = values[index] || ''; // Default to empty string if missing
                });
                result.push(entry);
            }
            resolve(result);
        };

        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};
