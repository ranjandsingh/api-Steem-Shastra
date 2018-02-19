import Session from '../models/session.model';

export async function runTask() {
  const cursor = Session.find({
    expiry: {
      $lte: new Date()
    }
  }).cursor();

  let session;
  while ((session = await cursor.next()) !== null) {
    await session.remove();
  }
}
