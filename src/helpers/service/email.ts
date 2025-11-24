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

const shortExpenseId = (id: any) => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = (hash << 5) - hash + id.charCodeAt(i);
            hash |= 0; // convert to 32-bit int
        }
        return `${"FORZA"}-${Math.abs(hash).toString(36).toUpperCase()}`; // base36 = short
}

const sentEmailToHr = async (Amount: any, ExecutiveName: any, isApprove: any, ExpenseReqId: any) => {
  try {

    const tableHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="color: #0056b3; margin-bottom: 10px;">Expense Request Update</h2>

        <p style="font-size: 15px; margin: 0;">Dear HR Team,</p>
        <br/>

        <p style="font-size: 15px; margin: 0;">
          <strong>Expense ID:</strong> ${shortExpenseId(ExpenseReqId)}
        </p>

        <p style="font-size: 15px; margin: 6px 0;">
          The expense request submitted by <strong>${ExecutiveName}</strong> for 
          <strong>₹${Amount || 0}</strong> has been 
          <strong style="color: ${isApprove ? '#28a745' : '#d9534f'};">
            ${isApprove ? 'approved' : 'rejected'}
          </strong> by the HOD.
        </p>

        <p style="font-size: 15px; margin: 6px 0;">
          Please process it as per the company policy.
        </p>

        <p style="font-size: 15px; margin: 6px 0;">
          For any issues or inquiries, please contact the Sales Application Support Team.
        </p>

        <br/>

        <a href="https://wsn3.workgateway.in" 
          target="_blank"
          style="display: inline-block; background: #0056b3; color: white; padding: 10px 18px; 
          text-decoration: none; border-radius: 6px; font-size: 15px;">
          Go to Portal
        </a>

        <br/><br/>

        <p style="font-size: 15px; margin: 4px 0;">Thank you,</p>
        <p style="font-size: 15px; margin: 2px 0;">Warm Regards,</p>
        <p style="font-size: 15px; font-weight: bold; margin: 0;">Sales Application Support Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: 'Forza8638@gmail.com',
      to: 'hr@forzamedi.com',
      cc: 'faizabadamit24@gmail.com',
      subject: `Expense Request Update – ${isApprove ? 'Approved' : 'Rejected'} (ID: ${shortExpenseId(ExpenseReqId)})`,
      text: `Expense request for ₹${Amount || 0} submitted by ${ExecutiveName} has been ${isApprove ? 'approved' : 'rejected'} by HOD.`,
      html: tableHTML
    });
  } catch (error) {
    console.log(error, "error in expense email send by manager");
  }
};

const sentEmailToFinance = async(Amount: any, ExecutiveName: any, isApprove: any, ExpenseReqId: any) => {
    try {
        const tableHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #0056b3; margin-bottom: 10px;">Expense Request Update</h2>

            <p style="font-size: 15px; margin: 0;">Dear Finance Team,</p>
            <br/>

            <p style="font-size: 15px; margin: 0;">
            <strong>Expense ID:</strong> ${shortExpenseId(ExpenseReqId)}
            </p>

            <p style="font-size: 15px; margin: 6px 0;">
            The expense request submitted by <strong>${ExecutiveName}</strong> for 
            <strong>₹${Amount || 0}</strong> has been 
            <strong style="color: ${isApprove ? '#28a745' : '#d9534f'};">
                ${isApprove ? 'approved' : 'rejected'}
            </strong> by the HOD.
            </p>

            <p style="font-size: 15px; margin: 6px 0;">
            Please process it as per the company policy.
            </p>

            <p style="font-size: 15px; margin: 6px 0;">
            For any issues or inquiries, please contact the Sales Application Support Team.
            </p>

            <br/>

            <a href="https://wsn3.workgateway.in" 
            target="_blank"
            style="display: inline-block; background: #0056b3; color: white; padding: 10px 18px; 
            text-decoration: none; border-radius: 6px; font-size: 15px;">
            Go to Portal
            </a>

            <br/><br/>

            <p style="font-size: 15px; margin: 4px 0;">Thank you,</p>
            <p style="font-size: 15px; margin: 2px 0;">Warm Regards,</p>
            <p style="font-size: 15px; font-weight: bold; margin: 0;">Sales Application Support Team</p>
        </div>
        `;
        await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: 'ramsingh@forzamedi.com',
            cc: 'faizabadamit24@gmail.com',
            subject: 'Expense',
            text: 'Please find the update regarding the expense',
            html: `${tableHTML}`
        });
    }
    catch (error) {
        console.log(error, "error in expense email send by manager");
    }
}

const sentRejectExpenseMail = async (ExecutiveEmail: any, Amount: any, ExecutiveName: any, From: any, To: any, isApprove: any, ExpenseReqId: any) => {
    try {

        // console.log(tableRows, "tableRows")
        const tableHTML = `
        <div>
        <h3>Hi ${ExecutiveName}</h3>
        <p>Please find the expense (Expense Id - ${shortExpenseId(ExpenseReqId)}) is ${isApprove ? 'approve' : 'reject'} by your manager.</p>
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
        await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: ExecutiveEmail,
            // cc: 'hr@forzamedi.com',
            subject: 'Expense',
            text: 'Please find the attached Excel file.',
            html: `${tableHTML}`
        });

        if(isApprove) {
            await sentEmailToHr(Amount, ExecutiveName, isApprove, ExpenseReqId);
        }
    }
    catch (error) {
        console.log(error, "error in expense email send by manager");
    }
};

const sentRejectExpenseMailByHr = async (ExecutiveEmail: any, Amount: any, ExecutiveName: any, From: any, To: any, isHold: any, ExpenseReqId: any) => {
    try {

        const tableHTML = `
        <div>
        <h3>Hi ${ExecutiveName}</h3>
        <p>Please find the expense ${isHold ? 'hold' : 'release'} by your HR.</p>
        <br />
            <p>Your expense of Amout (Expense Id - ${shortExpenseId(ExpenseReqId)}) is ${Amount ? Amount : 'N/A'} From ${From} to ${To} is ${isHold ? 'Hold' : 'Release'}.</p>
            <p>Please get in contact with the sales application support team with any issues or inquiries.</p>
            <br />
            <a href="https://wsn3.workgateway.in" target="_blank">Go to portal</a>
            <p>Thank You,</p>
            <p>Warm Regards,</p>
            <p>Sales Application Support Team</p>
            </div>
          `;

        // Send mail with defined transport object
        await transporter.sendMail({
            from: 'Forza8638@gmail.com',
            to: ExecutiveEmail,
            subject: 'Expense',
            text: 'Please find the attached Excel file.',
            html: `${tableHTML}`
        });

        if(isHold) {
            sentEmailToFinance(Amount, ExecutiveName, isHold, ExpenseReqId)
        }
    }
    catch (error) {
        console.log(error, "error in expense email send by hr");
    }
};

const sentRejectExpenseMailByFinance = async (ExecutiveEmail: any, Amount: any, ExecutiveName: any, From: any, To: any, isHold: any, ExpenseReqId: any) => {
    try {

        // console.log(tableRows, "tableRows")
        const tableHTML = `
        <div>
        <h3>Hi ${ExecutiveName}</h3>
        <p>Please find the expense (Expense Id - ${shortExpenseId(ExpenseReqId)}) is ${isHold ? 'hold' : 'release'} by Finance Department.</p>
        <br />
            <p>Your expense of Amout ${Amount ? Amount : 'N/A'} From ${From} to ${To} is ${isHold ? 'Hold' : 'Release'}.</p>
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
        console.log(error, "error in expense email send by finance");
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
    sentRejectExpenseMailByHr,
    sentRejectExpenseMailByFinance,
    sentApproveRejectVisitMail
}