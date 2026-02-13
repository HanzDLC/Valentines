(() => {
  const slides = Array.isArray(window.__VALENTINE_SLIDES__) ? window.__VALENTINE_SLIDES__ : [];
  const hasSlides = slides.length > 0;

  const welcomeView = document.getElementById("welcomeView");
  const galleryView = document.getElementById("galleryView");

  const beginBtn = document.getElementById("beginBtn");
  const homeBtn = document.getElementById("homeBtn");
  const autoPlayBtn = document.getElementById("autoPlayBtn");

  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");
  const slideCounter = document.getElementById("slideCounter");

  const photoFrame = document.querySelector(".photo-frame");
  const photoImage = document.getElementById("photoImage");
  const photoCaption = document.getElementById("photoCaption");
  const transitionFrame = document.getElementById("transitionFrame");
  const transitionTitle = document.getElementById("transitionTitle");
  const transitionDesc = document.getElementById("transitionDesc");

  const folderInfo = document.getElementById("folderInfo");
  const folderTitle = document.getElementById("folderTitle");
  const folderDesc = document.getElementById("folderDesc");
  const heartsLayer = document.querySelector(".hearts-layer");

  const audioToggle = document.getElementById("audioToggle");
  const bgAudio = document.getElementById("bgAudio");

  let mode = "welcome";
  let currentIndex = 0;

  const animateIn = (target) => {
    if (!window.gsap || !target) {
      return;
    }

    gsap.fromTo(target, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" });
  };

  const updateControls = () => {
    const total = Math.max(slides.length, 1);
    slideCounter.textContent = `${Math.min(currentIndex + 1, total)} / ${total}`;
    backBtn.disabled = !hasSlides || currentIndex <= 0;
    nextBtn.disabled = !hasSlides || currentIndex >= slides.length - 1;
  };

  const renderPhoto = () => {
    if (!hasSlides) {
      updateControls();
      return;
    }

    const slide = slides[currentIndex];

    // Reset caption visibility
    if (photoCaption) {
      photoCaption.classList.remove("visible");
      photoCaption.textContent = "";
    }

    if (slide.is_transition) {
      // Show Transition Slide
      if (photoFrame) photoFrame.classList.add("hidden");
      if (folderInfo) folderInfo.classList.remove("visible");

      if (transitionFrame && transitionTitle && transitionDesc) {
        transitionTitle.textContent = slide.source_folder || "Next Memory";
        transitionDesc.textContent = slide.folder_description || "";
        transitionFrame.classList.add("active");
      }
    } else {
      // Show Image Slide
      if (transitionFrame) transitionFrame.classList.remove("active");
      if (photoFrame) photoFrame.classList.remove("hidden");

      if (photoImage && slide.image) {
        photoImage.src = `/static/${slide.image}`;
        photoImage.alt = "Our memory";
        animateIn(photoImage);
      }

      // Show per-image caption if available
      if (photoCaption && slide.caption) {
        photoCaption.textContent = slide.caption;
        photoCaption.classList.add("visible");
      }

      if (folderInfo && folderTitle && folderDesc) {
        if (slide.source_folder) {
          folderTitle.textContent = slide.source_folder;
          folderDesc.textContent = slide.folder_description || "";
          folderInfo.classList.add("visible");
        } else {
          folderInfo.classList.remove("visible");
        }
      }
    }

    updateControls();
  };

  let autoAdvanceInterval = null;
  let isAutoPlaying = true;

  const startAutoAdvance = () => {
    if (!isAutoPlaying) return;

    stopAutoAdvance();
    autoAdvanceInterval = setInterval(goNext, 10000);
    if (autoPlayBtn) {
      autoPlayBtn.textContent = "Pause Slideshow";
      autoPlayBtn.classList.add("playing");
    }
  };

  const stopAutoAdvance = () => {
    if (autoAdvanceInterval) {
      clearInterval(autoAdvanceInterval);
      autoAdvanceInterval = null;
    }
    if (autoPlayBtn) {
      autoPlayBtn.textContent = "Play Slideshow";
      autoPlayBtn.classList.remove("playing");
    }
  };

  const toggleAutoAdvance = () => {
    isAutoPlaying = !isAutoPlaying;
    if (isAutoPlaying) {
      startAutoAdvance();
    } else {
      stopAutoAdvance();
    }
  };

  const showGallery = () => {
    mode = "gallery";
    welcomeView.classList.remove("active");
    galleryView.classList.add("active");
    animateIn(document.querySelector(".gallery-stage"));
    renderPhoto();
    void tryAutoPlay();
    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  const showWelcome = () => {
    mode = "welcome";
    galleryView.classList.remove("active");
    welcomeView.classList.add("active");
    animateIn(document.querySelector(".welcome-inner"));
    stopAutoAdvance();
  };

  const goNext = () => {
    if (!hasSlides) {
      return;
    }

    // Loop back to start if at the end
    if (currentIndex >= slides.length - 1) {
      currentIndex = 0;
    } else {
      currentIndex += 1;
    }
    renderPhoto();
  };

  const goBack = () => {
    if (!hasSlides) {
      return;
    }

    if (currentIndex <= 0) {
      currentIndex = slides.length - 1;
    } else {
      currentIndex -= 1;
    }
    renderPhoto();

    // Reset timer on manual interaction
    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  // Manual next also resets timer
  const manualNext = () => {
    goNext();
    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  beginBtn?.addEventListener("click", showGallery);
  homeBtn?.addEventListener("click", showWelcome);
  autoPlayBtn?.addEventListener("click", toggleAutoAdvance);
  nextBtn?.addEventListener("click", manualNext);
  backBtn?.addEventListener("click", goBack);

  document.addEventListener("keydown", (event) => {
    if (mode === "welcome") {
      if (event.key === "Enter" || event.key === " ") {
        showGallery();
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      goBack();
      return;
    }

    if (event.key === "ArrowRight") {
      manualNext();
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      manualNext();
    }
  });

  const spawnHearts = () => {
    if (!heartsLayer) {
      return;
    }

    heartsLayer.innerHTML = "";

    for (let i = 0; i < 22; i += 1) {
      const heart = document.createElement("span");
      heart.className = "heart";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.bottom = `${-10 - Math.random() * 80}px`;
      heart.style.opacity = `${0.3 + Math.random() * 0.5}`;
      heart.style.transform = `scale(${0.45 + Math.random() * 0.8}) rotate(45deg)`;
      heart.style.animationDuration = `${7 + Math.random() * 9}s`;
      heart.style.animationDelay = `${Math.random() * 5}s`;
      heartsLayer.appendChild(heart);
    }
  };

  const updateAudioState = (isPlaying) => {
    if (!audioToggle) {
      return;
    }

    audioToggle.classList.toggle("playing", isPlaying);
    audioToggle.setAttribute("aria-pressed", String(isPlaying));
    audioToggle.textContent = isPlaying ? "Pause Music" : "Play Music";
  };

  const tryAutoPlay = async () => {
    if (!bgAudio) {
      return;
    }

    if (!bgAudio.paused) {
      updateAudioState(true);
      return;
    }

    try {
      await bgAudio.play();
      updateAudioState(true);
    } catch {
      updateAudioState(false);
    }
  };

  if (audioToggle && bgAudio) {
    audioToggle.addEventListener("click", async () => {
      try {
        if (bgAudio.paused) {
          await bgAudio.play();
          updateAudioState(true);
        } else {
          bgAudio.pause();
          updateAudioState(false);
        }
      } catch (error) {
        updateAudioState(false);
        console.error("Audio playback needs user interaction.", error);
      }
    });

    bgAudio.addEventListener("pause", () => updateAudioState(false));
    bgAudio.addEventListener("play", () => updateAudioState(true));

    window.addEventListener("load", () => {
      void tryAutoPlay();
    });

    const unlockAudio = () => {
      void tryAutoPlay();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    document.addEventListener("pointerdown", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
  }

  // Unlock audio on any interaction if autoplay failed
  const unlockAudio = () => {
    if (bgAudio && bgAudio.paused) {
      bgAudio.play().then(() => {
        updateAudioState(true);
        // Remove listeners once successful
        document.removeEventListener("pointerdown", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
      }).catch(err => console.log("Audio unlock failed, waiting for next interaction"));
    }
  };

  document.addEventListener("pointerdown", unlockAudio);
  document.addEventListener("keydown", unlockAudio);

  // Ensure Begin button specifically triggers it
  beginBtn?.addEventListener("click", () => {
    unlockAudio();
    showGallery();
  });

  updateControls();
  spawnHearts();
})();
