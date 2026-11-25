(function () {
  var SERVICES = {
    "home-nursing": "الرعاية التمريضية المنزلية",
    "elderly-care": "رعاية كبار السن",
    "patient-assistance": "مساعدة المريض",
    "post-surgical": "الرعاية بعد العمليات"
  };

  var form = document.querySelector("#booking-form");
  if (!form) return;

  var fields = {
    fullName: form.querySelector("#full-name"),
    service: form.querySelector("#service"),
    phone: form.querySelector("#phone"),
    address: form.querySelector("#address"),
    date: form.querySelector("#date"),
    time: form.querySelector("#time"),
    notes: form.querySelector("#notes")
  };

  var summary = document.querySelector("#form-errors");
  var success = document.querySelector("#form-success");
  var preview = document.querySelector("#wa-preview");
  var fallback = document.querySelector("#wa-fallback");

  var params = new URLSearchParams(window.location.search);
  var requested = params.get("service");
  if (requested && Object.prototype.hasOwnProperty.call(SERVICES, requested)) {
    fields.service.value = requested;
  }

  var today = startOfDay(new Date());
  var maxDay = new Date(today.getTime());
  maxDay.setDate(maxDay.getDate() + 120);
  fields.date.min = formatISO(today);
  fields.date.max = formatISO(maxDay);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var result = validate();
    clearErrors();
    if (result.errors.length) {
      showErrors(result.errors);
      success.hidden = true;
      return;
    }

    var message = buildMessage(result.values);
    var href = "https://wa.me/201224274670?text=" + encodeURIComponent(message);
    preview.textContent = message;
    fallback.href = href;
    success.hidden = false;
    summary.hidden = true;
    window.open(href, "_blank", "noopener");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    success.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  });

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", function () {
      fields[key].removeAttribute("aria-invalid");
      fields[key].classList.remove("is-invalid");
      var error = document.getElementById(fields[key].id + "-error");
      if (error) error.textContent = "";
    });
  });

  function validate() {
    var errors = [];
    var values = {};
    var name = collapse(fields.fullName.value);
    if (!/^[\p{L}][\p{L}\s'.-]{2,79}$/u.test(name)) {
      errors.push({ field: fields.fullName, message: "اكتب الاسم الكامل بثلاثة أحرف على الأقل، بدون أرقام." });
    } else {
      values.fullName = name;
    }

    var service = fields.service.value;
    if (!Object.prototype.hasOwnProperty.call(SERVICES, service)) {
      errors.push({ field: fields.service, message: "اختر الخدمة المطلوبة من القائمة." });
    } else {
      values.service = SERVICES[service];
    }

    var phone = normalizePhone(fields.phone.value);
    if (!/^01[0125]\d{8}$/.test(phone)) {
      errors.push({ field: fields.phone, message: "اكتب رقم موبايل مصري صحيح، مثل 01xxxxxxxxx." });
    } else {
      values.phone = phone;
    }

    var address = collapse(fields.address.value);
    if (address.length < 5 || address.length > 200) {
      errors.push({ field: fields.address, message: "اكتب المنطقة أو العنوان (5 أحرف على الأقل)." });
    } else {
      values.address = address;
    }

    var date = parseISODate(fields.date.value);
    if (!date) {
      errors.push({ field: fields.date, message: "اختر تاريخًا صحيحًا." });
    } else if (date < today || date > maxDay) {
      errors.push({ field: fields.date, message: "اختر تاريخًا من اليوم وحتى 120 يومًا قادمًا." });
    } else {
      values.date = date.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    if (!isWorkingTime(fields.time.value)) {
      errors.push({ field: fields.time, message: "اختر وقتًا بين 10:00 صباحًا و10:00 مساءً." });
    } else {
      values.time = fields.time.value;
    }

    var notes = collapse(fields.notes.value);
    if (notes.length < 3 || notes.length > 500) {
      errors.push({ field: fields.notes, message: "اكتب ملاحظة مختصرة عن احتياج المريض (من 3 إلى 500 حرف)." });
    } else {
      values.notes = notes;
    }

    return { errors: errors, values: values };
  }

  function showErrors(errors) {
    summary.hidden = false;
    summary.replaceChildren();
    var title = document.createElement("p");
    title.textContent = "راجع الحقول التالية قبل إرسال الطلب:";
    var list = document.createElement("ul");
    errors.forEach(function (error) {
      var item = document.createElement("li");
      item.textContent = error.message;
      list.appendChild(item);
      error.field.classList.add("is-invalid");
      error.field.setAttribute("aria-invalid", "true");
      var slot = document.getElementById(error.field.id + "-error");
      if (slot) slot.textContent = error.message;
    });
    summary.append(title, list);
    errors[0].field.focus();
  }

  function clearErrors() {
    summary.hidden = true;
    summary.replaceChildren();
    Object.keys(fields).forEach(function (key) {
      fields[key].classList.remove("is-invalid");
      fields[key].removeAttribute("aria-invalid");
      var slot = document.getElementById(fields[key].id + "-error");
      if (slot) slot.textContent = "";
    });
  }

  function buildMessage(values) {
    return [
      "مرحباً، أريد حجز زيارة تمريض منزلي.",
      "",
      "الاسم: " + values.fullName,
      "الخدمة: " + values.service,
      "الهاتف / واتساب: " + values.phone,
      "المنطقة / العنوان: " + values.address,
      "التاريخ المفضل: " + values.date,
      "الوقت المفضل: " + values.time,
      "ملاحظات: " + values.notes,
      "",
      "هذا طلب حجز عبر الموقع، والموعد غير مؤكد إلى أن يتم التواصل معي."
    ].join("\n");
  }

  function collapse(value) {
    return value.trim().replace(/\s+/g, " ");
  }

  function normalizePhone(value) {
    var phone = value.trim().replace(/[\s()-]/g, "");
    if (phone.indexOf("00") === 0) phone = "+" + phone.slice(2);
    if (phone.indexOf("+20") === 0) phone = "0" + phone.slice(3);
    else if (phone.indexOf("20") === 0 && phone.length === 12) phone = "0" + phone.slice(2);
    return phone;
  }

  function parseISODate(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return startOfDay(date);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function formatISO(date) {
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function isWorkingTime(value) {
    var match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return false;
    var hour = Number(match[1]);
    var minute = Number(match[2]);
    if (hour > 23 || minute > 59) return false;
    var total = hour * 60 + minute;
    return total >= 10 * 60 && total <= 22 * 60;
  }
})();
