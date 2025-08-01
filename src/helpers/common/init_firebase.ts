/* eslint-disable */
// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyBDi8Cd6_vM5XYUwY-BRVslpyXDMrfLrkg",
//     authDomain: "wsn-project-5384e.firebaseapp.com",
//     projectId: "wsn-project-5384e",
//     storageBucket: "wsn-project-5384e.appspot.com",
//     messagingSenderId: "442572026644",
//     appId: "1:442572026644:web:7a35bac92602af7d8dc801",
//     measurementId: "G-0PT1JGDDCW"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// module.exports = {
//     analytics
// }

import { initializeApp } from "firebase/app";
// import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBDi8Cd6_vM5XYUwY-BRVslpyXDMrfLrkg",
    authDomain: "wsn-project-5384e.firebaseapp.com",
    projectId: "wsn-project-5384e",
    storageBucket: "wsn-project-5384e.appspot.com",
    messagingSenderId: "442572026644",
    appId: "1:442572026644:web:7a35bac92602af7d8dc801",
    measurementId: "G-0PT1JGDDCW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the storage service, which is used to create references in your storage bucket
const storage = getStorage(app);

export default storage;