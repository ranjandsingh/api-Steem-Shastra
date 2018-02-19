import * as faker from "Faker";
import * as mongoose from "mongoose";
import { User, Post } from "../server/models";
const counter = 5;

type CallbackFunction = (...args) => any;

const DBURL = "mongodb://localhost/utopian-test";
const connection = mongoose.connect(DBURL);
(mongoose as any).Promise = global.Promise;

const generateUsers = () => {
    let usersArray = Array();
    for (let index = 1; index <= counter; index++) {
        const email = faker.Internet.email();
        let account =
            faker.Internet.userName() +
            String(Math.floor(Math.random() * 10000));
        account = account.replace(/[^a-zA-Z0-9]/g, "");
        usersArray[index] = { account, email };
    }
    return usersArray;
};

function addPosts() {
    return generatePosts()
        .then(postArray => {
            return Post.insertMany(postArray).then(docs => {
                console.log(`${docs.length} posts were successfully stored.`);
            });
        })
        .catch(err => {
            throw `Post.insertMany generated an error \n>>>\n>>> ${
                err.message
            }\n>>>`;
        });
}

async function generatePosts() {
    const count: number = await User.count({});
    const arrayOfAuthors: any[] = [];
    for (let i = 0; i < count; ++i) {
        arrayOfAuthors.push((await User.findOne().skip(i) as any).account);
    }
    return arrayOfAuthors.map((author, index) => {
        //generating array of
        const title = faker.Lorem.sentence();
        const body = faker.Lorem.sentences();
        return {
            id: index + 1,
            author: author,
            title,
            body
        };
    });
}

const addUsers = () =>
    User.insertMany(generateUsers())
        .then(docs =>
            console.log(`${docs.length} users were successfully stored.`)
        )
        .catch(err => {
            throw `User.insertMany generated an error \n>>>\n>>> ${
                err.message
            }\n>>>`;
        });

new Promise((resolve: CallbackFunction) => resolve())
    .then(() => addUsers())
    .then(() => addPosts())
    .then(() => process.exit(0))
    .catch(err => console.error(err));
