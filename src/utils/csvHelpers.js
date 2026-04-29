export const generateCSVTemplate = (type) => {
    let headers = '';
    let rows = [];

    switch (type) {
        case 'class':
            headers = 'Name,Division,StartTime,EndTime,Days';
            rows = ['10,A,17:00,18:00,Monday;Tuesday;Wednesday', '10,B,08:00,10:00,Friday;Saturday', '9,A,,,'];
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

            const line1 = lines[0];
            let delimiter = ',';
            
            // Auto-detect delimiter if comma fails
            if (!line1.includes(',') && line1.includes(';')) {
                delimiter = ';';
            }

            const headers = line1.split(delimiter).map(h => h.trim().toLowerCase());
            const result = [];

            for (let i = 1; i < lines.length; i++) {
                // Split and handle potential quote issues
                let values = lines[i].split(delimiter).map(v => v.trim());

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
