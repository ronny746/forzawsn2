import cron from 'node-cron';
import moment from 'moment'
import { sendAttendenceMail } from '../../controllers/admin/cron.controller'

// [1 * * * *] time min 1
// [*/1 * * * *] interval 1
// [*/10 * * * * *] time second 1
// https://www.npmjs.com/package//node-cron  -> CRON documentation
cron.schedule('50 23 * * *', async function () {
    console.log("============MARK ATTENDENCE ON CRON JOB==========");
    await sendAttendenceMail()
});
// cron.schedule('*/20 * * * * *', async function () {
//     console.log("============MARK ATTENDENCE ON CRON JOB==========");
//     await sendAttendenceMail()
// });
