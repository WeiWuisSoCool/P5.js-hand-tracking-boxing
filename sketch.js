let video;
let bodyPose;
let poses = [];
let emojis = [];
let smokeEffects = [];
let spawnInterval = 20; // 每隔多少帧生成一个新 Emoji
let frameCount = 0;
let gameTimer = 0; // 游戏计时器
let gameDuration = 600; // 游戏持续时间 (帧数) 约10秒
let gameOver = false; // 游戏是否结束
let gameStarted = false; // 游戏是否已开始
let winMessage = "";
let remainingCount = { "🌸": 0, "❄️": 0 }; // 未击中的Emoji统计

// BlazePose的手部关键点索引 (左手腕和右手腕)
const handKeypoints = [15, 16];

function preload() {
  bodyPose = ml5.bodyPose("BlazePose", { flipped: true });
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();
  bodyPose.detectStart(video, gotPoses);
}

function draw() {
  background(220);
  image(video, 0, 0);

  if (!gameStarted) {
    textSize(30);
    fill(255, 0, 0);
    text("START", width / 2.5, height / 2);
    checkStartCondition();
    return;
  }

  if (gameOver) {
    textSize(30);
    fill(0, 255, 0);
    text(winMessage, width / 4, height / 2 - 20);
    text(`Remaining 🌸: ${remainingCount["🌸"]}`, width / 4, height / 2 + 20);
    text(`Remaining ❄️: ${remainingCount["❄️"]}`, width / 4, height / 2 + 60);
    return;
  }

  frameCount++;
  gameTimer++;

  // 显示倒计时
  textSize(20);
  fill(255, 0, 0);
  text(`Time Left: ${Math.ceil((gameDuration - gameTimer) / 60)}s`, 10, 30);

  if (gameTimer > gameDuration) {
    // 统计未击中的Emoji
    remainingCount = { "🌸": 0, "❄️": 0 };
    for (let emoji of emojis) {
      if (emoji.isAlive) {
        remainingCount[emoji.char] = (remainingCount[emoji.char] || 0) + 1;
      }
    }

    // 游戏结束检查是否所有Emoji被击中
    if (emojis.every(emoji => !emoji.isAlive)) {
      winMessage = "You Win! 🎉";
    } else {
      winMessage = "Game Over! 😢";
    }
    gameOver = true;
    return;
  }

  if (frameCount % spawnInterval === 0) {
    spawnEmoji("left", "🌸"); // 左边喷射 🌸
    spawnEmoji("right", "❄️"); // 右边喷射 ❄️
  }

  // 绘制手部关键点
  if (poses.length > 0) {
    let pose = poses[0];

    for (let i of handKeypoints) {
      let keypoint = pose.keypoints[i];
      if (keypoint && keypoint.confidence > 0.1) {
        textSize(80); // 设置Emoji大小
        text('🥊', keypoint.x, keypoint.y); // 用🥊代替红色圆点
      }
    }

    // 检测碰撞
    for (let emoji of emojis) {
      if (!emoji.isAlive) continue;

      for (let i of handKeypoints) {
        let keypoint = pose.keypoints[i];
        if (
          keypoint &&
          keypoint.confidence > 0.1 &&
          dist(keypoint.x, keypoint.y, emoji.x, emoji.y) < emoji.size
        ) {
          emoji.isAlive = false;
          smokeEffects.push({ x: emoji.x, y: emoji.y, time: 30 }); // 生成烟雾
        }
      }
    }
  }

  // 绘制并更新 Emoji
  for (let i = emojis.length - 1; i >= 0; i--) {
    let emoji = emojis[i];
    if (!emoji.isAlive) continue;

    fill(255);
    textSize(emoji.size);
    text(emoji.char, emoji.x, emoji.y);

    // 更新位置
    emoji.x += emoji.vx;
    emoji.y += emoji.vy;
    emoji.size += 1; // 逐渐变大

    // 删除超出屏幕范围的 Emoji
    if (
      emoji.x < 0 || emoji.x > width || 
      emoji.y < 0 || emoji.y > height
    ) {
      emojis.splice(i, 1);
    }
  }

  // 绘制烟雾效果
  for (let i = smokeEffects.length - 1; i >= 0; i--) {
    let smoke = smokeEffects[i];
    fill(200, 200, 200, smoke.time * 8);
    textSize(50);
    text('💨', smoke.x, smoke.y);
    smoke.time--;
    if (smoke.time <= 0) {
      smokeEffects.splice(i, 1); // 移除完成的烟雾
    }
  }
}

function checkStartCondition() {
  if (poses.length > 0) {
    let pose = poses[0];
    let leftHand = pose.keypoints[15];
    let rightHand = pose.keypoints[16];

    if (
      leftHand &&
      rightHand &&
      leftHand.confidence > 0.1 &&
      rightHand.confidence > 0.1 &&
      dist(leftHand.x, leftHand.y, rightHand.x, rightHand.y) < 50
    ) {
      gameStarted = true;
      gameTimer = 0;
      frameCount = 0;
    }
  }
}

function spawnEmoji(side, char) {
  let x, y, vx, vy, targetX, targetY;

  if (side === "left") {
    x = width / 4; // 左侧喷射点
    y = height / 4; // 左上角
    targetX = random(0, width / 2); // 左下随机点
    targetY = random(height / 2, height);
  } else if (side === "right") {
    x = (3 * width) / 4; // 右侧喷射点
    y = height / 4; // 右上角
    targetX = random(width / 2, width); // 右下随机点
    targetY = random(height / 2, height);
  }

  vx = (targetX - x) / 100; // 根据目标点计算速度
  vy = (targetY - y) / 100;

  emojis.push({
    x,
    y,
    size: 10,
    vx,
    vy,
    char,
    isAlive: true,
  });
}

function gotPoses(results) {
  poses = results;
}
