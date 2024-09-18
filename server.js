const app = require( './app' );
const mongoose = require( 'mongoose' );

//connecting with db.
mongoose.connect( process.env.MONGOOSE_URI )
.then( () => console.log( "Connected to mongodb" ) )
.catch ( err => console.error( `Error caught while connecting to mongodb ${ err }` ) );

//creating the server.
const port = process.env.PORT || 3080;
app.listen( port, ( err ) => {
    if ( err ) console.error( `Error caught while running the server ${ err }` );
    else console.log( `Server is running successfully on port ${ port }` );
} );    