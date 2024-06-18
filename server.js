import 'dotenv/config';
import db from './db.js';
import app from './app.js';
const PORT = process.env.PORT;

app.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log(`Server is listening on ${PORT}`);
});
