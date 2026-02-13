(() => {
  const slides = Array.isArray(window.__VALENTINE_SLIDES__) ? window.__VALENTINE_SLIDES__ : [];
  const hasSlides = slides.length > 0;

  const welcomeView = document.getElementById("welcomeView");
  const galleryView = document.getElementById("galleryView");
  const endView = document.getElementById("endView");
  const letterView = document.getElementById("letterView");

  const beginBtn = document.getElementById("beginBtn");
  const homeBtn = document.getElementById("homeBtn");
  const autoPlayBtn = document.getElementById("autoPlayBtn");
  const endBtn = document.getElementById("endBtn");
  const letterBtn = document.getElementById("letterBtn");
  const replayBtn = document.getElementById("replayBtn");
  const endHomeBtn = document.getElementById("endHomeBtn");
  const backToEndBtn = document.getElementById("backToEndBtn");
  const letterHomeBtn = document.getElementById("letterHomeBtn");

  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");
  const slideCounter = document.getElementById("slideCounter");
  const collectionJump = document.getElementById("collectionJump");
  const collectionSelect = document.getElementById("collectionSelect");

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
  const endCollage = document.getElementById("endCollage");

  const audioToggle = document.getElementById("audioToggle");
  const bgAudio = document.getElementById("bgAudio");

  let mode = "welcome";
  let currentIndex = 0;
  let autoAdvanceInterval = null;
  let isAutoPlaying = true;
  let renderToken = 0;

  const imageCache = new Map();
  const imageLoadPromises = new Map();
  const transitionSlides = slides
    .map((slide, index) => (slide.is_transition ? { index, title: slide.source_folder || `Collection ${index + 1}` } : null))
    .filter(Boolean);
  const slideToCollectionStart = [];

  {
    let currentStart = 0;
    for (let i = 0; i < slides.length; i += 1) {
      if (slides[i]?.is_transition) {
        currentStart = i;
      }
      slideToCollectionStart[i] = currentStart;
    }
  }

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
    if (collectionSelect && transitionSlides.length > 0) {
      const collectionStart = slideToCollectionStart[currentIndex] ?? transitionSlides[0].index;
      const nextValue = String(collectionStart);
      if (collectionSelect.value !== nextValue) {
        collectionSelect.value = nextValue;
      }
    }
  };

  const buildEndCollage = () => {
    if (!endCollage) {
      return;
    }

    const selectedImages = [
      "images/After Church Dates/IMG_20251207_202612_759.jpg",
      "images/After Church Dates/IMG_20251228_201150_653.jpg",
      "images/CAS Days Hosting/2.jpg",
      "images/First Date/2.jpg",
      "images/Fort San Pedro/5.jpeg",
      "images/Kylie's Birthday Date/4.jpg",
      "images/My Birthday/5.jpg",
      "images/New Year's Date/3.jpg",
      "images/Others/After Duty Date 2.jpg",
      "images/Others/First Devo.jpg",
      "images/Others/Judge2.jpg",
      "images/Others/Sunday Bake Night.jpg",
      "images/Our First Major Fight/2.jpg",
      "images/Photobooth/photobooth2.jpg",
      "images/Pinning Ceremony/1.jpg",
      "images/Rainy Date/0.jpg",
      "images/The Way/2.jpg",
      "images/The Way Concert/2.jpg",
      "images/The Wilted Flower Story/3.jpg",
    ];

    endCollage.innerHTML = "";

    selectedImages.forEach((imagePath, index) => {
      const card = document.createElement("figure");
      card.className = "polaroid";
      card.style.setProperty("--tilt", `${(Math.random() * 14 - 7).toFixed(2)}deg`);
      card.style.setProperty("--delay", `${(index * 0.06).toFixed(2)}s`);

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "Memory";
      img.src = `/static/${imagePath}`;
      card.appendChild(img);

      const targetSlideIndex = slides.findIndex((slide) => slide && !slide.is_transition && slide.image === imagePath);
      if (targetSlideIndex >= 0) {
        card.classList.add("clickable");
        card.setAttribute("role", "button");
        card.tabIndex = 0;
        card.setAttribute("aria-label", "Open this memory in slideshow");
        card.addEventListener("click", () => {
          currentIndex = targetSlideIndex;
          showGallery();
        });
        card.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            currentIndex = targetSlideIndex;
            showGallery();
          }
        });
      }

      endCollage.appendChild(card);
    });
  };

  const setupCollectionJump = () => {
    if (!collectionJump || !collectionSelect) {
      return;
    }

    if (!hasSlides || transitionSlides.length === 0) {
      collectionJump.classList.add("hidden");
      collectionSelect.disabled = true;
      return;
    }

    collectionSelect.innerHTML = "";
    transitionSlides.forEach((entry) => {
      const option = document.createElement("option");
      option.value = String(entry.index);
      option.textContent = entry.title;
      collectionSelect.appendChild(option);
    });

    collectionSelect.value = String(slideToCollectionStart[currentIndex] ?? transitionSlides[0].index);
    collectionSelect.addEventListener("change", () => {
      const targetIndex = Number.parseInt(collectionSelect.value, 10);
      if (!Number.isInteger(targetIndex)) {
        return;
      }
      currentIndex = Math.min(Math.max(targetIndex, 0), slides.length - 1);
      void renderPhoto();
      if (isAutoPlaying) {
        startAutoAdvance();
      }
    });
  };

  const imageUrlForSlide = (slide) => {
    if (!slide || slide.is_transition || !slide.image) {
      return null;
    }
    return `/static/${slide.image}`;
  };

  const preloadImage = (url) => {
    if (!url) {
      return Promise.resolve(null);
    }

    const cached = imageCache.get(url);
    if (cached?.complete) {
      return Promise.resolve(cached);
    }

    const pending = imageLoadPromises.get(url);
    if (pending) {
      return pending;
    }

    const img = cached || new Image();
    img.decoding = "async";

    const loadPromise = new Promise((resolve) => {
      img.onload = () => {
        imageCache.set(url, img);
        imageLoadPromises.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        imageLoadPromises.delete(url);
        resolve(null);
      };
    });

    imageLoadPromises.set(url, loadPromise);
    if (!cached) {
      img.src = url;
      imageCache.set(url, img);
    }
    return loadPromise;
  };

  const warmUpNearbyImages = (index) => {
    const offsets = [0, 1, -1, 2, -2];
    offsets.forEach((offset) => {
      const slide = slides[index + offset];
      const url = imageUrlForSlide(slide);
      if (url) {
        void preloadImage(url);
      }
    });
  };

  const renderPhoto = async () => {
    if (!hasSlides) {
      updateControls();
      return;
    }

    const token = ++renderToken;
    const slide = slides[currentIndex];

    if (photoCaption) {
      photoCaption.classList.remove("visible");
      photoCaption.textContent = "";
    }

    if (slide.is_transition) {
      if (photoFrame) photoFrame.classList.add("hidden");
      if (folderInfo) folderInfo.classList.remove("visible");

      if (transitionFrame && transitionTitle && transitionDesc) {
        transitionTitle.textContent = slide.source_folder || "Next Memory";
        transitionDesc.textContent = slide.folder_description || "";
        transitionFrame.classList.add("active");
      }
    } else {
      if (transitionFrame) transitionFrame.classList.remove("active");
      if (photoFrame) photoFrame.classList.remove("hidden");

      const imageUrl = imageUrlForSlide(slide);
      if (photoImage && imageUrl) {
        await preloadImage(imageUrl);
        if (token !== renderToken) {
          return;
        }

        if (photoImage.src !== imageUrl) {
          photoImage.src = imageUrl;
        }
        photoImage.alt = "Our memory";

        if (typeof photoImage.decode === "function") {
          try {
            await photoImage.decode();
          } catch {
            // Ignore decode errors and continue.
          }
        }

        if (token !== renderToken) {
          return;
        }
        animateIn(photoImage);
      }

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

    warmUpNearbyImages(currentIndex);
    updateControls();
  };

  const startAutoAdvance = () => {
    if (!isAutoPlaying) return;

    stopAutoAdvance();
    autoAdvanceInterval = setInterval(() => {
      void goNext();
    }, 10000);

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
    endView?.classList.remove("active");
    letterView?.classList.remove("active");
    galleryView.classList.add("active");
    animateIn(document.querySelector(".gallery-stage"));
    warmUpNearbyImages(currentIndex);
    void renderPhoto();
    void tryAutoPlay();

    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  const showWelcome = () => {
    mode = "welcome";
    endView?.classList.remove("active");
    letterView?.classList.remove("active");
    galleryView.classList.remove("active");
    welcomeView.classList.add("active");
    animateIn(document.querySelector(".welcome-inner"));
    stopAutoAdvance();
  };

  const showEnd = () => {
    mode = "end";
    stopAutoAdvance();
    galleryView.classList.remove("active");
    welcomeView.classList.remove("active");
    letterView?.classList.remove("active");
    endView?.classList.add("active");
    animateIn(document.querySelector(".end-inner"));
  };

  const showLetter = () => {
    mode = "letter";
    stopAutoAdvance();
    galleryView.classList.remove("active");
    welcomeView.classList.remove("active");
    endView?.classList.remove("active");
    letterView?.classList.add("active");
    animateIn(document.querySelector(".letter-inner"));
  };

  const goNext = () => {
    if (!hasSlides) {
      return;
    }

    if (currentIndex >= slides.length - 1) {
      showEnd();
      return;
    } else {
      currentIndex += 1;
    }

    void renderPhoto();
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

    void renderPhoto();
    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  const manualNext = () => {
    void goNext();
    if (isAutoPlaying) {
      startAutoAdvance();
    }
  };

  beginBtn?.addEventListener("click", showGallery);
  homeBtn?.addEventListener("click", showWelcome);
  autoPlayBtn?.addEventListener("click", toggleAutoAdvance);
  nextBtn?.addEventListener("click", manualNext);
  backBtn?.addEventListener("click", goBack);
  endBtn?.addEventListener("click", showEnd);
  letterBtn?.addEventListener("click", showLetter);
  replayBtn?.addEventListener("click", () => {
    currentIndex = 0;
    showGallery();
  });
  endHomeBtn?.addEventListener("click", showWelcome);
  backToEndBtn?.addEventListener("click", showEnd);
  letterHomeBtn?.addEventListener("click", showWelcome);

  document.addEventListener("keydown", (event) => {
    if (mode === "welcome") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showGallery();
      }
      return;
    }

    if (mode === "end") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        currentIndex = 0;
        showGallery();
      }
      return;
    }

    if (mode === "letter") {
      if (event.key === "Escape") {
        showEnd();
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

  updateControls();
  buildEndCollage();
  setupCollectionJump();
  warmUpNearbyImages(0);
  spawnHearts();
})();
