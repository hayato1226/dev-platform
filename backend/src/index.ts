import {LocalWorkspace, ConcurrentUpdateError, StackAlreadyExistsError, StackNotFoundError} from "@pulumi/pulumi/x/automation";
import * as aws from "@pulumi/aws";
import * as express from "express";

const projectName = "dev_platform";

/**
 * @description Programm body of deploy development environment (Deploy android VMs).
 * @param num Number of Instance
 */
const pulumiProgram = (num : number) => async () => {
    const size = "t3.small";
    // デプロイ対象（genymotion）のAMIのID
    const amiId = "ami-0f2164a9ad44d0a80";

    // Requirements from https://docs.genymotion.com/paas/7.0/01_Requirements.html
    const group = new aws.ec2.SecurityGroup("genymotion-secgrp", {
        ingress: [
            {
                protocol: "tcp",
                fromPort: 22,
                toPort: 22,
                cidrBlocks: ["0.0.0.0/0"]
            },
            {
                protocol: "tcp",
                fromPort: 80,
                toPort: 80,
                cidrBlocks: ["0.0.0.0/0"]
            },
            {
                protocol: "tcp",
                fromPort: 443,
                toPort: 443,
                cidrBlocks: ["0.0.0.0/0"]
            },
            {
                protocol: "tcp",
                fromPort: 51000,
                toPort: 51100,
                cidrBlocks: ["0.0.0.0/0"]
            }, {
                protocol: "udp",
                fromPort: 51000,
                toPort: 51100,
                cidrBlocks: ["0.0.0.0/0"]
            }, {
                protocol: "udp",
                fromPort: 5555,
                toPort: 5555,
                cidrBlocks: ["0.0.0.0/0"]
            },
        ],
        egress: [
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"]
            }
        ]
    });

    let servers = [];
    [...Array(num)].map(async (n, idx) => {
        const server = await new aws.ec2.Instance(`android-${idx}`, {
            instanceType: size,
            vpcSecurityGroupIds: [group.id],
            ami: amiId
        });
        servers.push({publicIp: server.publicIp, publicHostName: server.publicDns, instanceId: server.id});
    });

    return {servers: servers}
};

// creates new envs
const createHandler: express.RequestHandler = async (req, res) => {
    const stackName = req.body.id;
    const num = req.body.number as number;
    const region = req.body.region || process.env.AWS_REGION || 'ap-northeast-1';
    try { // create a new stack
        const stack = await LocalWorkspace.createStack({
            stackName, projectName,
            // generate our pulumi program on the fly from the POST body
            program: pulumiProgram(num)
        });
        await stack.setConfig("aws:region", {value: region});
        // deploy the stack, tailing the logs to console
        const upRes = await stack.up({onOutput: console.info});
        res.json({id: stackName, result: upRes.outputs.servers.value});
    } catch (e) {
        if (e instanceof StackAlreadyExistsError) {
            res.status(409).send(`stack "${stackName}" already exists`);
        } else {
            res.status(500).send(e);
        }
    }
};
// lists all envs
const listHandler: express.RequestHandler = async (req, res) => {
    try { // set up a workspace with only enough information for the list stack operations
        const ws = await LocalWorkspace.create({
            projectSettings: {
                name: projectName,
                runtime: "nodejs"
            }
        });
        const stacks = await ws.listStacks();
        res.json({
            ids: stacks.map(s => s.name)
        });
    } catch (e) {
        res.status(500).send(e);
    }
};
// gets info about a specific env
const getHandler: express.RequestHandler = async (req, res) => {
    const stackName = req.params.id;
    try { // select the existing stack
        const stack = await LocalWorkspace.selectStack({
            stackName, projectName,
            // don't need a program just to get outputs
            program: async () => {}
        });
        const outs = await stack.outputs();
        res.json({id: stackName, servers: outs.servers.value});
    } catch (e) {
        if (e instanceof StackNotFoundError) {
            res.status(404).send(`stack "${stackName}" does not exist`);
        } else {
            res.status(500).send(e);
        }
    }
};
// updates the number of machines existing env
const updateHandler: express.RequestHandler = async (req, res) => {
    const stackName = req.params.id;
    const num = req.body.number as number;
    const region = req.body.region || process.env.AWS_REGION || 'ap-northeast-1';
    try { // select the existing stack
        const stack = await LocalWorkspace.selectStack({
            stackName, projectName,
            // generate our pulumi program on the fly from the POST body
            program: pulumiProgram(num)
        });
        await stack.setConfig("aws:region", {value: region});
        // deploy the stack, tailing the logs to console
        const upRes = await stack.up({onOutput: console.info});
        res.json({id: stackName, result: upRes.outputs.servers.value});
    } catch (e) {
        if (e instanceof StackNotFoundError) {
            res.status(404).send(`stack "${stackName}" does not exist`);
        } else if (e instanceof ConcurrentUpdateError) {
            res.status(409).send(`stack "${stackName}" already has update in progress`)
        } else {
            res.status(500).send(e);
        }
    }
};
// deletes a env
const deleteHandler: express.RequestHandler = async (req, res) => {
    const stackName = req.params.id;
    try { // select the existing stack
        const stack = await LocalWorkspace.selectStack({
            stackName, projectName,
            // don't need a program for destroy
            program: async () => {}
        });
        // deploy the stack, tailing the logs to console
        await stack.destroy({onOutput: console.info});
        await stack.workspace.removeStack(stackName);
        res.status(200).end();
    } catch (e) {
        if (e instanceof StackNotFoundError) {
            res.status(404).send(`stack "${stackName}" does not exist`);
        } else if (e instanceof ConcurrentUpdateError) {
            res.status(409).send(`stack "${stackName}" already has update in progress`)
        } else {
            res.status(500).send(e);
        }
    }
};
const ensurePlugins = async () => {
    const ws = await LocalWorkspace.create({});
    await ws.installPlugin("aws", "v3.2.1");
};

// install necessary plugins once upon boot
ensurePlugins();

// configure express
const app = express();
app.use(express.json());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    next();
});

// setup routes for our DevEnv resource
app.post("/devenv", createHandler);
app.get("/devenv", listHandler);
app.get("/devenv/:id", getHandler);
app.put("/devenv/:id", updateHandler);
app.delete("/devenv/:id", deleteHandler);

// start server
const PORT: string = process.env.PORT || '3001';
app.listen(PORT, () => console.info(`server running on :${PORT}`));
