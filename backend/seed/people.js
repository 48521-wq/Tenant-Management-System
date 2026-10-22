// Fictional Pakistani sample people. Names, numbers and addresses are invented;
// document numbers use an obviously sequential pattern and must not be treated
// as real identities.
const TENANTS = [
  { name: 'Hamza Tariq',     father: 'Tariq Mehmood',   gender: 'Male',   dob: '14-03-1996', city: 'Lahore',     job: 'Software engineer' },
  { name: 'Ayesha Siddiqui', father: 'Imran Siddiqui',  gender: 'Female', dob: '02-11-1994', city: 'Lahore',     job: 'Pharmacist' },
  { name: 'Usman Ghani',     father: 'Abdul Ghani',     gender: 'Male',   dob: '23-07-1992', city: 'Faisalabad', job: 'Bank officer' },
  { name: 'Fatima Noor',     father: 'Noor Muhammad',   gender: 'Female', dob: '19-01-1998', city: 'Islamabad',  job: 'Lecturer' },
  { name: 'Bilal Hussain',   father: 'Zahid Hussain',   gender: 'Male',   dob: '08-09-1990', city: 'Rawalpindi', job: 'Civil engineer' },
  { name: 'Sana Mirza',      father: 'Asif Mirza',      gender: 'Female', dob: '30-05-1995', city: 'Lahore',     job: 'Graphic designer' },
  { name: 'Danish Rehman',   father: 'Abdul Rehman',    gender: 'Male',   dob: '11-12-1993', city: 'Multan',     job: 'Accountant' },
  { name: 'Maryam Qureshi',  father: 'Shahid Qureshi',  gender: 'Female', dob: '27-04-1997', city: 'Lahore',     job: 'Doctor' },
  { name: 'Hassan Raza',     father: 'Raza Ali',        gender: 'Male',   dob: '05-08-1991', city: 'Gujranwala', job: 'Business analyst' },
  { name: 'Zainab Akhtar',   father: 'Akhtar Hussain',  gender: 'Female', dob: '16-02-1999', city: 'Lahore',     job: 'Student' },
  { name: 'Faizan Malik',    father: 'Malik Yousaf',    gender: 'Male',   dob: '21-10-1989', city: 'Sialkot',    job: 'Sales manager' },
  { name: 'Hira Butt',       father: 'Naeem Butt',      gender: 'Female', dob: '09-06-1996', city: 'Lahore',     job: 'Architect' },
];

const MAINTENANCE = [
  { type: 'Plumbing',     priority: 'high',   text: 'Kitchen sink pipe is leaking from the joint under the cabinet. Water collects on the floor every time the tap is used.' },
  { type: 'Electrical',   priority: 'medium', text: 'The socket in the master bedroom sparks when a charger is plugged in. Switched off the breaker for now.' },
  { type: 'Gas',          priority: 'urgent', text: 'Smell of gas near the kitchen stove line. We closed the main valve and opened the windows - please inspect urgently.' },
  { type: 'AC / Cooling', priority: 'medium', text: 'Split AC in the drawing room is not cooling and makes a rattling noise. Filter was cleaned but the problem remains.' },
  { type: 'Painting',     priority: 'low',    text: 'Seepage marks and peeling paint on the bathroom ceiling after the last rain. Needs repainting once the leak is fixed.' },
  { type: 'Structural',   priority: 'high',   text: 'Hairline crack has appeared above the main door frame and is slowly widening. Requesting an inspection.' },
  { type: 'Plumbing',     priority: 'medium', text: 'Low water pressure in the upstairs bathroom shower. Tank and motor are working fine.' },
  { type: 'Other',        priority: 'low',    text: 'Main gate latch is loose and the lock does not engage properly at night.' },
];

const COMPLAINTS = [
  { category: 'Noise',       priority: 'medium', subject: 'Late-night noise from upstairs',       text: 'Loud music and moving of furniture continues after midnight on most weekdays. Polite requests were ignored.' },
  { category: 'Water',       priority: 'high',   subject: 'No water supply in the morning',       text: 'The water tank is empty by 7 AM almost every day, and the motor timing seems to have changed.' },
  { category: 'Electricity', priority: 'medium', subject: 'Frequent tripping of the main breaker', text: 'The breaker trips whenever the AC and the geyser run together. This has happened several times this month.' },
  { category: 'Security',    priority: 'high',   subject: 'Street light and gate camera not working', text: 'The street light outside the gate and the gate camera have been off for two weeks, which is a safety concern.' },
  { category: 'Neighbor',    priority: 'low',    subject: 'Neighbour parking blocks the gate',    text: 'A neighbour regularly parks in front of our gate and we cannot take our car out in the morning.' },
  { category: 'Rent',        priority: 'low',    subject: 'Receipt for last month not issued',    text: 'I paid last month rent on time but have not received a written receipt yet. Please share one.' },
];

module.exports = { TENANTS, MAINTENANCE, COMPLAINTS };
