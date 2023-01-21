const cellWidth = 60;
const cellHeight = 50;
const cellSize = 20;

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y
	}
}

const drawRect = (color, x, y, w, h) => {
	ctx.fillStyle = color;
	ctx.fillRect(
		x * cellSize,
		y * cellSize,
		w * cellSize,
		h * cellSize
	)
};


class Room {
	index = 0;

	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.center = new Point(
			this.x + Math.round(this.w / 2),
			this.y + Math.round(this.h / 2)
		);
	}

	paint() {
		drawRect('#888', this.x, this.y, this.w, this.h);
		ctx.font = '40px serif';
		ctx.fillStyle = 'rgb(0,163,255)';
		ctx.fillText(this.index.toString(), (this.x + this.w * .5) * cellSize, (this.y + this.h * .5) * cellSize);
	}

	drawPath(point) {
		const xa = this.center.x;
		const ya = this.center.y;
		const xb = point.x;
		const yb = point.y;

		const c = "rgba(229,0,255,0.53)";
		if (xa === xb) {
			drawRect(c, xa, ya, 1, Math.abs(ya - yb));
		} else {
			drawRect(c, xa, ya, Math.abs(xa - xb), 1)
		}
	}
}

class RoomContainer extends Room {
	constructor(x, y, w, h) {
		super(x, y, w, h);
		this.room = undefined
	}

	paint() {
		ctx.strokeStyle = "#0F0";
		ctx.lineWidth = 1;
		ctx.strokeRect(this.x * cellSize, this.y * cellSize,
			this.w * cellSize, this.h * cellSize)
	}

	growRoom() {
		let x, y, w, h;
		if (1) {
			x = this.x + random(1, Math.floor(this.w / 3));
			y = this.y + random(1, Math.floor(this.h / 3));
			w = this.w - (x - this.x);
			h = this.h - (y - this.y);
			w -= random(1, w / 3);
			h -= random(1, h / 3);
			this.room = new Room(x, y, w, h);
		} else {
			this.room = new Room(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
		}
	}
}


const randomSplit = room => {
	let r1, r2;
	const vertical = random(0, 1) === 0;

	if (vertical) {
		r1 = new RoomContainer(room.x, room.y, random(1, room.w), room.h);
		r2 = new RoomContainer(room.x + r1.w, room.y, room.w - r1.w, room.h);

		if (r1.w / r1.h < .45 || r2.w / r2.h < .45) {
			return randomSplit(room)
		}
	} else {
		r1 = new RoomContainer(room.x, room.y, room.w, random(1, room.h));
		r2 = new RoomContainer(room.x, room.y + r1.h, room.w, room.h - r1.h);

		if (r1.h / r1.w < .45 || r2.h / r2.w < .45) {
			return randomSplit(room)
		}
	}
	return [r1, r2]
};

const splitRoom = (room, i) => {
	const Root = new Tree(room);
	room.paint();
	if (i !== 0) {
		const sr = randomSplit(room);
		Root.lchild = splitRoom(sr[0], i - 1);
		Root.rchild = splitRoom(sr[1], i - 1)
	}
	return Root
};

const drawGrid = () => {
	ctx.beginPath();
	ctx.strokeStyle = "rgba(255,255,255,0.4)";
	ctx.lineWidth = 0.5;

	for (let i = 0; i < cellWidth; i++) {
		ctx.moveTo(i * cellSize, 0);
		ctx.lineTo(i * cellSize, cellHeight * cellSize);
	}
	for (let i = 0; i < cellHeight; i++) {
		ctx.moveTo(0, i * cellSize);
		ctx.lineTo(cellWidth * cellSize, i * cellSize)
	}
	ctx.stroke();
	ctx.closePath();
};

class Tree {
	constructor(leaf) {
		this.leaf = leaf;
		this.lchild = undefined;
		this.rchild = undefined
	}

	getLeafs() {
		if (this.lchild === undefined && this.rchild === undefined) {
			return [this.leaf];
		} else {
			return [].concat(this.lchild.getLeafs(), this.rchild.getLeafs());
		}
	}

	paint() {
		this.leaf.paint();
		if (this.lchild !== undefined) {
			this.lchild.paint();
		}
		if (this.rchild !== undefined) {
			this.rchild.paint();
		}
	}
}

const drawTree = tree => {
	if (tree.lchild !== undefined && tree.rchild !== undefined) {
		tree.lchild.leaf.drawPath(tree.rchild.leaf.center);

		drawTree(tree.lchild);
		drawTree(tree.rchild);
	}
};

const generate = () => {
	canvas.width = cellSize * cellWidth;
	canvas.height = cellSize * cellHeight;

	const rooms = [];
	const mainRoom = new RoomContainer(0, 0, cellWidth, cellHeight);
	const roomTree = splitRoom(mainRoom, 3);
	const leafs = roomTree.getLeafs();
	for (let i = 0; i < leafs.length; i++) {
		leafs[i].growRoom();
		const room = leafs[i].room;
		room.index = rooms.length;
		rooms.push(room);
	}

	roomTree.paint();

	for (let i = 0; i < rooms.length; i++) {
		rooms[i].paint();
	}

	drawTree(roomTree);

	drawGrid();
};

generate();

document.getElementById('generate').addEventListener('click', e => {
	e.preventDefault();
	generate()
});

export {};