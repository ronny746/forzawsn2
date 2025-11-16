/* eslint-disable */

const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');

// Function to convert data to Excel
const convertToExcel = async (data: any) => {
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add header row
    worksheet.addRow(Object.keys(data[0]));

    // Add data rows
    data.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
    });

    // Save the workbook to a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "Forza8638@gmail.com",
        pass: "uais njfz rlqz czva",
    },
});

const sentCreatedExpenseMail = async (attachment: any, data: any, ManagerEmail: any, Amount: any, managerName: any) => {
    try {

        // console.log(ManagerEmail, "Email", data);

        data.pop();
        data.pop();
        data.pop();
        data.pop();

        const tableRows = data.map((row: any) => {
            return `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`;
        });

        // console.log(tableRows, "tableRows")
        const tableHTML = `
        <div>
        <h3>Hi ${managerName}</h3>
        <p>Please find the expense created below.</p>
        <br />
            <table border="1">
              <thead>
                <tr>${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${tableRows.join('')}
                <tr><td>Total Amount</td><td></td><td></td><td></td><td></td><td></td><td></td><td>${Amount}</td></tr>
              </tbody>
            </table>
            <p>Please get in contact with the sales application support team with any issues or inquiries.</p>
            <br />
            <a href="https://wsn3.workgateway.in" target="_blank">Go to portal</a>
            <p>Thank You,</p>
            <p>Warm Regards,</p>
            <p>Sales Application Support Team</p>
            </div>
          `;

        // Send mail with defined transport object
        let info = await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: ManagerEmail,
            // cc: 'hrgroup@forzamedi.com',
            subject: 'Expense',
            text: 'Please find the attached Excel file.',
            html: `${tableHTML}`,
            attachments: [{
                filename: 'data.xlsx',
                content: attachment // This is now the resolved buffer
            }]
        });

        console.log(info, "info");
    }
    catch (error) {
        console.log(error, "error in expense email send");
    }
};

const sentRejectExpenseMail = async (ExecutiveEmail: any, Amount: any, ExecutiveName: any, From: any, To: any, isApprove: any) => {
    try {

        // console.log(tableRows, "tableRows")
        const tableHTML = `
        <div>
        <h3>Hi ${ExecutiveName}</h3>
        <p>Please find the expense ${isApprove ? 'approve' : 'reject'} by your manager.</p>
        <br />
            <p>Your expense of Amout ${Amount ? Amount : 'N/A'} From ${From} to ${To} is ${isApprove ? 'Approved' : 'Rejected'}.</p>
            <p>Please get in contact with the sales application support team with any issues or inquiries.</p>
            <br />
            <a href="https://wsn3.workgateway.in" target="_blank">Go to portal</a>
            <p>Thank You,</p>
            <p>Warm Regards,</p>
            <p>Sales Application Support Team</p>
            </div>
          `;

        // Send mail with defined transport object
        let info = await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: ExecutiveEmail,
            // cc: 'hrgroup@forzamedi.com',
            subject: 'Expense',
            text: 'Please find the attached Excel file.',
            html: `${tableHTML}`
        });

        console.log(info, "info");
    }
    catch (error) {
        console.log(error, "error in expense email send");
    }
};

const sentApproveRejectVisitMail = async (visits: any, ManagerName: any, isApprove: any) => {
    try {

        // Construct the list of visits as a string
    const visitsList = visits
    .map((item: any, index: number) => `Visit ${index + 1}: From ${item.VisitFrom} to ${item.VisitTo}`)
    .join('<br />'); // Use <br /> for line breaks in HTML

    console.log(visits, "visits")
  // Create the HTML content
  const tableHTML = `
    <div>
      <h3>Hi ${visits[0]?.FirstName} ${visits[0]?.LastName}</h3>
      <p>Please find the visit ${isApprove ? 'Approved' : 'Rejected'} by your manager.</p>
      <br />
      <p>Your Visit Details:</p>
      <p>${visitsList}</p>
      <p>The visit is ${isApprove ? 'Approved' : 'Rejected'} by ${ManagerName}.</p>
            <p>Please get in contact with the sales application support team with any issues or inquiries.</p>
            <br />
            <a href="https://wsn3.workgateway.in" target="_blank">Go to portal</a>
            <p>Thank You,</p>
            <p>Warm Regards,</p>
            <p>Sales Application Support Team</p>
            </div>
          `;

        // Send mail with defined transport object
        let info = await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: visits[0]?.Email,
            // cc: 'hrgroup@forzamedi.com',
            subject: 'Visit Plan',
            text: 'Please find the attached Excel file.',
            html: `${tableHTML}`
        });

        console.log(info, "info");
    }
    catch (error) {
        console.log(error, "error in expense email send");
    }
};


export {
    sentCreatedExpenseMail,
    convertToExcel,
    sentRejectExpenseMail,
    sentApproveRejectVisitMail
}