import { request } from 'undici';

const res = await request('http://localhost:3000/signup/?step=1');
const body = await res.body.text();

console.log('Body length:', body.length);
console.log('Contains <form:', body.toLowerCase().includes('<form'));
// Let's print the first 2000 characters of the body to see what it contains
console.log('Body start:', body.slice(0, 2000));
