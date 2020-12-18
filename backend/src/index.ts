import {LocalWorkspace, ConcurrentUpdateError, StackAlreadyExistsError, StackNotFoundError} from "@pulumi/pulumi/x/automation";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as express from "express";

const projectName = "devpf";

/**
 * @description Programm body of deploy development environment (Android VMs stack).
 * @param num Number of Instance
 */
const pulumiProgram = (num : number) => async () => {
    const size = "t3.small";
    // genymotion's AMI ID
    const amiId = "ami-0f2164a9ad44d0a80";

    // Only public subnet(traffic is routed to an Internet Gateway)
    const vpc = new awsx.ec2.Vpc(projectName, {
        numberOfAvailabilityZones: 2, // 1 is only for test
        subnets: [
            {
                type: "public"
            }
        ]
    });

    // Sevurity Group for Web Server
    const publicSg = new awsx.ec2.SecurityGroup(`android-${projectName}`, {vpc});

    // Rules: Requirements from https://docs.genymotion.com/paas/7.0/01_Requirements.html
    // inbound SSH traffic on port 22 from anywhere
    publicSg.createIngressRule("ssh-access-genymotion", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(22),
        description: "allow SSH access from anywhere"
    });

    // inbound HTTP traffic on port 80 from anywhere
    publicSg.createIngressRule("http-access-genymotion-ui", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(80),
        description: "allow HTTP access from anywhere"
    });
    // inbound HTTPS traffic on port 443 from anywhere
    publicSg.createIngressRule("https-access-genymotion-ui", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(443),
        description: "allow HTTPS access from anywhere"
    });

    // inbound TCP traffic on port 51000-51100 from anywhere
    publicSg.createIngressRule("webrtc-tcp-access-genymotion-ui", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.TcpPorts(51000,51100),
        description: "allow TCP 51000-51100 access from anywhere"
    });

    // inbound UDP traffic on port 51000-51100 from anywhere
    publicSg.createIngressRule("webrtc-udp-https-access-genymotion-ui", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.UdpPorts(51000,51100),
        description: "allow UDP 51000-51100 access from anywhere"
    });

    // outbound TCP traffic on any port to anywhere
    publicSg.createEgressRule("outbound-access", {
        location: new awsx.ec2.AnyIPv4Location(),
        ports: new awsx.ec2.AllTcpPorts(),
        description: "allow outbound access to anywhere"
    });

    const publicSubnetIds = await vpc.publicSubnetIds;

    let servers = [];
    [...Array(num)].map(async (n, idx) => {
        const server = await new aws.ec2.Instance(`android-${idx}`, {
            instanceType: size,
            vpcSecurityGroupIds: [publicSg.id],
            ami: amiId,
            associatePublicIpAddress: true,
            subnetId: publicSubnetIds[0],
        });
        servers.push({publicIp: server.publicIp, publicHostName: server.publicDns, instanceId: server.id});
    });

    return {servers: servers}
};

// creates new stack
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
// lists all stacks
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
// get info about a specific stack
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
// updates the number of machines existing stack
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
// delete stack
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

// setup routes
app.post("/stack", createHandler);
app.get("/stack", listHandler);
app.get("/stack/:id", getHandler);
app.put("/stack/:id", updateHandler);
app.delete("/stack/:id", deleteHandler);

// start server
const PORT: string = process.env.PORT || '3001';
app.listen(PORT, () => console.info(`server running on :${PORT}`));
