const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// Variabel state
let userMessage = null;
let isResponseGenerating = false;

// Daftar kata terlarang (contoh)
const forbiddenWords = ["dog", "cat", "fish", "elephant"]; // Tambahkan nama hewan lainnya jika diperlukan

// Fungsi untuk memuat tema dan data chat dari local storage saat halaman dimuat
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  // Terapkan tema yang disimpan
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Kembalikan chat yang disimpan atau bersihkan kontainer chat
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Gulir ke bagian bawah
}

// Fungsi untuk membuat elemen pesan baru dan mengembalikannya
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

// Fungsi untuk menampilkan efek mengetik dengan menampilkan kata satu per satu
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' '); // Pisahkan teks menjadi kata-kata
  let currentWordIndex = 0; // Indeks untuk melacak kata yang saat ini ditampilkan

  const typingInterval = setInterval(() => {
    // Tambahkan setiap kata ke elemen teks dengan spasi
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    // Jika semua kata sudah ditampilkan
    if (currentWordIndex === words.length) {
      clearInterval(typingInterval); // Hentikan interval
      isResponseGenerating = false; // Set status tidak lagi menghasilkan respons
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML); // Simpan chat ke local storage
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Gulir ke bagian bawah
  }, 75); // Setiap kata muncul setiap 75 ms
}

// Fungsi untuk memeriksa kata terlarang di respons
const containsForbiddenWords = (text) => {
  return forbiddenWords.some(word => text.toLowerCase().includes(word.toLowerCase())); // Periksa apakah respons mengandung kata terlarang
}

// Fungsi untuk mengambil respons dari API lokal berdasarkan pesan pengguna
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text"); // Mendapatkan elemen teks

  try {
    // Kirim permintaan POST ke API lokal dengan pesan pengguna
    const response = await fetch("http://203.194.112.48:8000/chat_submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userMessage }), // Ubah sesuai dengan API yang digunakan
    });

    const result = await response.text(); // Mendapatkan hasil sebagai teks
    if (!response.ok) throw new Error(result); // Jika respons tidak oke, lempar error

    // Periksa apakah hasilnya mengandung kata terlarang
    if (containsForbiddenWords(result)) {
      textElement.innerText = "Maaf, saya tidak dapat memberikan informasi tersebut.";
      incomingMessageDiv.classList.add("error"); // Tandai pesan sebagai error
    } else {
      // Tampilkan teks respons API
      showTypingEffect(result, textElement, incomingMessageDiv); // Tampilkan efek mengetik
    }
  } catch (error) { // Tangani error
    isResponseGenerating = false;
    textElement.innerText = error.message; // Tampilkan pesan error
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading"); // Hapus kelas 'loading' setelah respons diterima
  }
}

// Fungsi untuk menampilkan animasi loading saat menunggu respons API
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="images/gemini.svg" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading"); // Buat elemen pesan loading
  chatContainer.appendChild(incomingMessageDiv); // Tambahkan ke kontainer chat

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Gulir ke bagian bawah
  generateAPIResponse(incomingMessageDiv); // Panggil fungsi untuk mengambil respons API
}

// Fungsi untuk menyalin teks pesan ke clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText; // Dapatkan teks pesan

  navigator.clipboard.writeText(messageText); // Salin teks ke clipboard
  copyButton.innerText = "done"; // Tampilkan ikon konfirmasi
  setTimeout(() => copyButton.innerText = "content_copy", 1000); // Kembalikan ikon setelah 1 detik
}

// Fungsi untuk menangani pengiriman pesan keluar
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage; // Dapatkan pesan dari input
  if (!userMessage || isResponseGenerating) return; // Keluar jika tidak ada pesan atau masih memproses respons

  isResponseGenerating = true; // Set status sedang menghasilkan respons

  const html = `<div class="message-content">
                  <img class="avatar" src="images/user.jpg" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing"); // Buat elemen pesan keluar
  outgoingMessageDiv.querySelector(".text").innerText = userMessage; // Masukkan pesan pengguna ke dalam elemen teks
  chatContainer.appendChild(outgoingMessageDiv); // Tambahkan ke kontainer chat
  
  typingForm.reset(); // Kosongkan input form
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Gulir ke bagian bawah
  setTimeout(showLoadingAnimation, 500); // Tampilkan animasi loading setelah penundaan
}

// Fungsi untuk mengganti antara tema terang dan gelap
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode"); // Beralih mode
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode"); // Simpan preferensi ke local storage
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode"; // Ubah teks tombol
});

// Fungsi untuk menghapus semua chat dari local storage ketika tombol ditekan
deleteChatButton.addEventListener("click", () => {
  if (confirm("Apakah Anda yakin ingin menghapus semua chat?")) {
    localStorage.removeItem("saved-chats"); // Hapus chat yang disimpan
    loadDataFromLocalstorage(); // Muat ulang halaman tanpa chat
  }
});

// Fungsi untuk menangani pengiriman pesan keluar ketika saran diklik
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText; // Ambil teks saran sebagai pesan pengguna
    handleOutgoingChat(); // Kirim pesan keluar
  });
});

// Mencegah pengiriman form default dan tangani pengiriman pesan keluar
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

// Muat data tema dan chat dari local storage saat halaman dimuat
loadDataFromLocalstorage();
