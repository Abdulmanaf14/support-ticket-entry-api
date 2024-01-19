const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3500;
const cors = require('cors');


app.use(cors());


app.use(bodyParser.json());
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/agent', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// check connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});


const supportAgentSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
    },
    Email: {
        type: String,
        required: true,
        validate: {
            validator: (value) => {
                // Email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message: 'Invalid email address',
        },
    },
    Phone: {
        type: String,
        required: true,
        validate: {
            validator: (value) => {
                // Mobile number validation (assuming it's a 10-digit number)
                const phoneRegex = /^\d{10}$/;
                return phoneRegex.test(value);
            },
            message: 'Invalid mobile number',
        },
    },
    Description: {
        type: String,
        required: true,
    },
    id: {
        type: Number,
        index: false, // Exclude from indexing
    },
});



const counterschema = new mongoose.Schema({
    id: String,
    seq: Number
})


const ticketcounterschema = new mongoose.Schema({
    id: String,
    seq: Number
})



const ticketSchema = new mongoose.Schema({
    Topic: String,
    DateCreated: {
        type: Date,
        default: Date.now,
    },
    Description: String,
    Severity: String,
    Type: String,
    AssignedTo: Number,
    status: {
        type: String,
        required: true,
    },
    ResolvedOn: String,
    id: {
        type: Number,
        index: false,
    },

});

const ticketcountermodel = mongoose.model('ticketcounter', ticketcounterschema);
const ticketmodel = mongoose.model("ticketmodel", ticketSchema)
const countermodel = mongoose.model('counter', counterschema);
const SupportAgent = mongoose.model('SupportAgent', supportAgentSchema);

app.post('/support-tickets', async (req, res) => {

    const tickets = await ticketmodel.find().lean();
    const ids = tickets.map(item => item.AssignedTo);
    const agents = await SupportAgent.find().lean()
    const filteredArray = agents.filter(item => !ids.includes(item.id));
    assignedArray = filteredArray.map(item => item.id);




    try {
        let cd = await ticketcountermodel.findOneAndUpdate(
            { id: 'autoval' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        let seqid;
        if (cd == null) {
            const newval = new ticketcountermodel({ id: 'autoval', seq: 1 });
            cd = await newval.save();
            seqid = 1
        }
        else {
            seqid = cd.seq
        }
        const { Topic, Severity, Description, Type, ResolvedOn } = req.body;

        // Create a new support agent
        const newticket = new ticketmodel({ Topic, Description, Severity, Type, AssignedTo: assignedArray.length > 0 ? assignedArray[0] : null, status: assignedArray.length > 0 ? 'Assigned' : "New", ResolvedOn, id: seqid });

        // Save the support agent to the database
        const saveticket = await newticket.save();

        // Respond with the saved support agent
        res.json(saveticket);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }



})

app.post('/support-agents', async (req, res) => {
    try {

        let cd = await countermodel.findOneAndUpdate(
            { id: 'autoval' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        let seqid;
        if (cd == null) {
            const newval = new countermodel({ id: 'autoval', seq: 1 });
            cd = await newval.save();
            seqid = 1
        }
        else {
            seqid = cd.seq
        }

        const { Name, Email, Phone, Description } = req.body;
        if (!Name || !Email || !Phone || !Description) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const newAgent = new SupportAgent({ Name, Email, Phone, Description, id: seqid });

        const savedAgent = await newAgent.save();

        res.json(savedAgent);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: errors });
        }
        res.status(500).json({ error: error.message });
    }
});

app.get('/support-agents', async (req, res) => {
    try {
        const agents = await SupportAgent.find().lean();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/support-tickets', async (req, res) => {
    try {
        const tickets = await ticketmodel.find().lean();
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
