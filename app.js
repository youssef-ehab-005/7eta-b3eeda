
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, defaultWhatsAppNumber } from './firebase-config.js';

// Remove ChatGPT tracking parameter from URL
(() => {
  const url = new URL(window.location.href);

  if (url.searchParams.get('utm_source') === 'chatgpt.com') {
    url.searchParams.delete('utm_source');

    window.history.replaceState(
      {},
      '',
      url.pathname + url.search + url.hash
    );
  }
})();

const demoProducts = [
  {id:'d1',name:'Oreo Frappe',price:75,category:'cold',emoji:'🥤',description:'قهوة باردة مع الأوريو والكريمة',featured:true},
  {id:'d2',name:'Iced Spanish Latte',price:70,category:'cold',emoji:'🧋',description:'إسبانيش لاتيه مثلج'},
  {id:'d3',name:'Mango Smoothie',price:65,category:'juice',emoji:'🥭',description:'مانجو فريش بطعم غني'},
  {id:'d4',name:'Strawberry Milkshake',price:60,category:'cold',emoji:'🍓',description:'ميلك شيك فراولة'},
  {id:'d5',name:'Caramel Macchiato',price:70,category:'hot',emoji:'☕',description:'قهوة بالكريمة والكراميل'},
  {id:'d6',name:'Fresh Orange',price:45,category:'juice',emoji:'🍊',description:'عصير برتقال فريش'},
  {id:'d7',name:'French Fries',price:35,category:'snack',emoji:'🍟',description:'بطاطس مقرمشة'},
  {id:'d8',name:'Classic Cappuccino',price:55,category:'hot',emoji:'☕',description:'كابتشينو برغوة الحليب'},
  {id:'d9',name:'Water Bottle',price:10,category:'market',emoji:'💧',description:'مياه معدنية'},
  {id:'d10',name:'Chocolate Bar',price:25,category:'market',emoji:'🍫',description:'شوكولاتة'}
];

const $ = s => document.querySelector(s);
const money = n => `${Number(n||0).toLocaleString('en-US')} EGP`;

let app, auth, db, connected=false, currentUser=null;
let products=[...demoProducts];
let cart=JSON.parse(localStorage.getItem('zetaCart')||'[]');
let orders=[];
let whatsappNumber=localStorage.getItem('zetaWhatsapp')||defaultWhatsAppNumber;

try {
  if(firebaseConfig.apiKey!=='YOUR_API_KEY' && firebaseConfig.projectId!=='YOUR_PROJECT_ID'){
    app=initializeApp(firebaseConfig);
    auth=getAuth(app);
    db=getFirestore(app);
    connected=true;

    onAuthStateChanged(auth,u=>{
      currentUser=u;
      if(location.hash==='#admin'&&u) showDashboard();
    });
  }
} catch(e) {
  console.warn('Firebase initialization:',e);
}

function toast(msg){
  const el=$('#toast');
  el.textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2600);
}

function persistCart(){
  localStorage.setItem('zetaCart',JSON.stringify(cart));
  renderCart();
}

async function loadProducts(){
  if(!connected)return;
  try{
    const snap=await getDocs(collection(db,'products'));
    if(!snap.empty) products=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderProducts();
  }catch(e){
    console.error(e);
  }
}

function productCard(p){
  return `<article class="product-card">
    <div class="product-image">
      ${p.image
        ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`
        : `<span class="product-emoji">${p.emoji||'☕'}</span>`}
    </div>
    <h3>${escapeHtml(p.name)}</h3>
    <div class="product-desc">${escapeHtml(p.description||'')}</div>
    <div class="product-bottom">
      <b class="price">${money(p.price)}</b>
      <button class="add-btn" data-add="${p.id}">+ أضف للسلة</button>
    </div>
  </article>`;
}

function renderProducts(filter='all'){
  $('#menuProducts').innerHTML=products
    .filter(p=>p.category!=='market'&&(filter==='all'||p.category===filter))
    .map(productCard).join('')
    ||'<p class="muted">لا توجد منتجات في هذا القسم حالياً.</p>';

  $('#marketProductsGrid').innerHTML=products
    .filter(p=>p.category==='market')
    .map(productCard).join('')
    ||'<p class="muted">منتجات الماركت ستظهر هنا.</p>';

  document.querySelectorAll('[data-add]').forEach(b=>
    b.addEventListener('click',()=>addToCart(b.dataset.add))
  );
}

function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function addToCart(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;

  const row=cart.find(x=>x.id===id);

  if(row) row.qty++;
  else cart.push({
    id:p.id,
    name:p.name,
    price:Number(p.price),
    emoji:p.emoji||'☕',
    qty:1
  });

  persistCart();
  toast('اتضاف للسلة بنجاح');
}

function renderCart(){
  const count=cart.reduce((a,x)=>a+x.qty,0);
  const total=cart.reduce((a,x)=>a+x.qty*x.price,0);

  $('#cartCount').textContent=count;
  $('#cartTotal').textContent=money(total);

  $('#cartItems').innerHTML=cart.length
    ? cart.map(x=>`
      <div class="cart-row">
        <span class="thumb">${x.emoji||'☕'}</span>
        <div>
          <b>${escapeHtml(x.name)}</b>
          <small>${money(x.price)}</small>
        </div>
        <div class="qty">
          <button data-qty="${x.id}" data-delta="-1">−</button>
          <b>${x.qty}</b>
          <button data-qty="${x.id}" data-delta="1">+</button>
        </div>
      </div>
    `).join('')
    : '<p class="muted">السلة فاضية… اختار حاجة على مزاجك ☕</p>';

  document.querySelectorAll('[data-qty]').forEach(b=>
    b.addEventListener('click',()=>{
      const item=cart.find(x=>x.id===b.dataset.qty);
      if(item){
        item.qty+=Number(b.dataset.delta);
        if(item.qty<=0) cart=cart.filter(x=>x.id!==item.id);
        persistCart();
      }
    })
  );
}

function openCart(){
  $('#cartDrawer').classList.add('open');
  $('#cartBackdrop').classList.add('open');
}

function closeCart(){
  $('#cartDrawer').classList.remove('open');
  $('#cartBackdrop').classList.remove('open');
}

$('#cartOpen').onclick=openCart;
$('#cartClose').onclick=closeCart;
$('#cartBackdrop').onclick=closeCart;

document.querySelectorAll('.filter').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    renderProducts(b.dataset.filter);
  };
});

// Checkout
$('#checkoutForm').addEventListener('submit',async e=>{
  e.preventDefault();

  if(!cart.length){
    toast('السلة فاضية');
    return;
  }

  if(!whatsappNumber||whatsappNumber.length<10){
    toast('أضف رقم واتساب الكافيه في firebase-config.js أولاً');
    return;
  }

  const name=$('#customerName').value.trim();
  const phone=$('#customerPhone').value.trim();
  const address=$('#customerAddress').value.trim();
  const notes=$('#orderNotes').value.trim();

  const total=cart.reduce((a,x)=>a+x.qty*x.price,0);

  const order={
    customerName:name,
    phone,
    address,
    notes,
    items:cart.map(({id,name,price,qty})=>({id,name,price,qty})),
    total,
    status:'new',
    createdAt:connected?serverTimestamp():new Date().toISOString()
  };

  try{
    if(connected){
      await addDoc(collection(db,'orders'),order);
    }else{
      const local=JSON.parse(localStorage.getItem('zetaOrders')||'[]');
      local.unshift({...order,createdAt:new Date().toISOString()});
      localStorage.setItem('zetaOrders',JSON.stringify(local));
    }
  }catch(err){
    toast('تعذر حفظ الطلب. حاول مرة أخرى.');
    console.error(err);
    return;
  }

  const lines=cart.map(x=>
    `• ${x.name} × ${x.qty} = ${x.price*x.qty} EGP`
  ).join('\n');

  const message=`طلب جديد - 7eta b3eeda
الاسم: ${name}
الموبايل: ${phone}
العنوان/الترابيزة: ${address}

${lines}

الإجمالي: ${total} EGP
ملاحظات: ${notes||'لا يوجد'}`;

  cart=[];
  persistCart();
  closeCart();
  e.target.reset();

  window.open(
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
    '_blank'
  );

  toast('تم تسجيل الطلب، أكمل الإرسال على واتساب');
});

// Navigation
function route(){
  const admin=location.hash==='#admin';

  $('#storeView').classList.toggle('hidden',admin);
  $('#adminView').classList.toggle('hidden',!admin);

  if(admin){
    if(currentUser) showDashboard();
    else showLogin();
  }else{
    closeCart();
  }
}

window.addEventListener('hashchange',route);
route();

$('#menuToggle').onclick=()=>{
  document.querySelector('.topbar nav').classList.toggle('show');
};

document.querySelectorAll('.topbar nav a').forEach(a=>
  a.addEventListener('click',()=>{
    document.querySelector('.topbar nav').classList.remove('show');
  })
);

// Admin Login
function showLogin(){
  $('#adminLogin').classList.remove('hidden');
  $('#dashboard').classList.add('hidden');
}

function showDashboard(){
  if(!currentUser)return;

  $('#adminLogin').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');

  loadAdminData();
  $('#whatsappSetting').value=whatsappNumber;
}

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();

  if(!connected){
    $('#loginError').textContent='اربط Firebase أولاً من firebase-config.js ثم أعد تحميل الصفحة.';
    return;
  }

  try{
    await signInWithEmailAndPassword(
      auth,
      $('#adminEmail').value,
      $('#adminPassword').value
    );

    currentUser=auth.currentUser;
    showDashboard();
  }catch(err){
    $('#loginError').textContent='بيانات الدخول غير صحيحة أو لا يمكن الاتصال.';
  }
};

$('#logoutBtn').onclick=async()=>{
  if(auth)await signOut(auth);
  currentUser=null;
  showLogin();
  location.hash='#home';
};

// Admin Tabs
document.querySelectorAll('.side-tab').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.side-tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');

    document.querySelectorAll('.admin-tab').forEach(x=>x.classList.add('hidden'));
    $('#tab-'+b.dataset.tab).classList.remove('hidden');

    if(b.dataset.tab==='orders')renderOrders();
    if(b.dataset.tab==='products')renderAdminProducts();
  };
});

// Load Admin Data
async function loadAdminData(){
  if(!currentUser)return;

  try{
    if(connected){
      const ps=await getDocs(collection(db,'products'));
      if(!ps.empty)products=ps.docs.map(d=>({id:d.id,...d.data()}));

      const os=await getDocs(query(
        collection(db,'orders'),
        orderBy('createdAt','desc')
      ));

      orders=os.docs.map(d=>({id:d.id,...d.data()}));
    }else{
      orders=JSON.parse(localStorage.getItem('zetaOrders')||'[]');
    }
  }catch(e){
    console.error(e);
    toast('تأكد من إعدادات Firestore والصلاحيات');
  }

  renderProducts();
  renderAdminProducts();
  renderOrders();

  const sales=orders.reduce((a,o)=>a+Number(o.total||0),0);

  $('#statOrders').textContent=orders.length;
  $('#statSales').textContent=money(sales);
  $('#statProducts').textContent=products.length;

  $('#recentOrders').innerHTML=orders.slice(0,5)
    .map(orderHtml).join('')
    ||'<p class="muted">لا توجد طلبات بعد.</p>';
}

function orderHtml(o){
  return `<div class="order-card">
    <div>
      <b>${escapeHtml(o.customerName||'عميل')}</b>
      <small>${escapeHtml(o.phone||'')} · ${money(o.total)}</small>
    </div>
    <select data-status="${o.id}">
      <option value="new" ${o.status==='new'?'selected':''}>جديد</option>
      <option value="preparing" ${o.status==='preparing'?'selected':''}>قيد التجهيز</option>
      <option value="done" ${o.status==='done'?'selected':''}>مكتمل</option>
      <option value="cancelled" ${o.status==='cancelled'?'selected':''}>ملغي</option>
    </select>
  </div>`;
}

function renderOrders(){
  $('#allOrders').innerHTML=orders.map(orderHtml).join('')
    ||'<p class="muted">لا توجد طلبات حتى الآن.</p>';

  document.querySelectorAll('[data-status]').forEach(s=>{
    s.onchange=async()=>{
      const o=orders.find(x=>x.id===s.dataset.status);
      if(o)o.status=s.value;

      if(connected){
        await updateDoc(doc(db,'orders',s.dataset.status),{
          status:s.value
        });
      }else{
        localStorage.setItem('zetaOrders',JSON.stringify(orders));
      }

      toast('تم تحديث حالة الطلب');
    };
  });
}

// Products Admin
function renderAdminProducts(){
  $('#adminProducts').innerHTML=products.map(p=>`
    <tr>
      <td>${p.emoji||'☕'} ${escapeHtml(p.name)}</td>
      <td>${p.category}</td>
      <td>${money(p.price)}</td>
      <td>متاح</td>
      <td class="table-actions">
        <button data-edit="${p.id}">تعديل</button>
        <button data-delete="${p.id}">حذف</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-edit]').forEach(b=>
    b.onclick=()=>editProduct(b.dataset.edit)
  );

  document.querySelectorAll('[data-delete]').forEach(b=>
    b.onclick=()=>removeProduct(b.dataset.delete)
  );
}

function editProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;

  $('#modalTitle').textContent='تعديل المنتج';
  $('#productId').value=p.id;
  $('#productName').value=p.name;
  $('#productPrice').value=p.price;
  $('#productCategory').value=p.category;
  $('#productEmoji').value=p.emoji||'';
  $('#productImage').value=p.image||'';
  $('#productDescription').value=p.description||'';

  $('#productModal').classList.remove('hidden');
}

$('#addProductBtn').onclick=()=>{
  $('#productForm').reset();
  $('#productId').value='';
  $('#modalTitle').textContent='إضافة منتج جديد';
  $('#productModal').classList.remove('hidden');
};

$('#modalClose').onclick=()=>{
  $('#productModal').classList.add('hidden');
};

$('#productModal').onclick=e=>{
  if(e.target.id==='productModal'){
    $('#productModal').classList.add('hidden');
  }
};

// Save Product
$('#productForm').onsubmit=async e=>{
  e.preventDefault();

  const id=$('#productId').value;

  const p={
    name:$('#productName').value.trim(),
    price:Number($('#productPrice').value),
    category:$('#productCategory').value,
    emoji:$('#productEmoji').value||'☕',
    image:$('#productImage').value.trim(),
    description:$('#productDescription').value.trim()
  };

  try{
    if(connected){
      if(id){
        await updateDoc(doc(db,'products',id),p);
      }else{
        await addDoc(collection(db,'products'),p);
      }
    }else{
      if(id){
        products=products.map(x=>x.id===id?{...p,id}:x);
      }else{
        products.push({...p,id:'local-'+Date.now()});
      }
    }
  }catch(err){
    toast('تعذر حفظ المنتج. راجع صلاحيات Firebase.');
    return;
  }

  if(!connected&&id){
    products=products.map(x=>x.id===id?{...p,id}:x);
  }

  if(!connected&&!id){
    products=products.filter(x=>!x.id.startsWith('d'));
  }

  $('#productModal').classList.add('hidden');

  renderProducts();
  renderAdminProducts();

  $('#statProducts').textContent=products.length;
  toast('تم حفظ المنتج');
};

// Delete Product
async function removeProduct(id){
  if(!confirm('متأكد من حذف المنتج؟'))return;

  try{
    if(connected)await deleteDoc(doc(db,'products',id));

    products=products.filter(p=>p.id!==id);

    renderProducts();
    renderAdminProducts();

    $('#statProducts').textContent=products.length;
    toast('تم حذف المنتج');
  }catch(e){
    toast('تعذر حذف المنتج');
  }
}

// WhatsApp Settings
$('#saveSettings').onclick=()=>{
  whatsappNumber=$('#whatsappSetting').value.replace(/\D/g,'');

  localStorage.setItem('zetaWhatsapp',whatsappNumber);
  toast('تم حفظ رقم واتساب على هذا الجهاز');
};

renderProducts();
renderCart();
loadProducts();

// PDF Product Import
// Extraction runs in the browser; nothing is uploaded to a third-party service.

let pdfImportRows=[];

const pdfModal=$('#pdfImportModal');

$('#importPdfBtn').onclick=()=>{
  pdfModal.classList.remove('hidden');
  $('#pdfFile').value='';
  $('#pdfImportStatus').textContent='لم يتم اختيار ملف بعد.';
  $('#pdfPreviewWrap').hidden=true;
  $('#savePdfProducts').disabled=true;
  pdfImportRows=[];
};

$('#pdfImportClose').onclick=()=>{
  pdfModal.classList.add('hidden');
};

pdfModal.onclick=e=>{
  if(e.target===pdfModal)pdfModal.classList.add('hidden');
};

$('#pdfFile').onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file)return;

  if(file.type!=='application/pdf'){
    toast('اختار ملف PDF فقط');
    return;
  }

  $('#pdfImportStatus').textContent='جاري قراءة الملف...';

  try{
    const pdfjs=await import(
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs'
    );

    pdfjs.GlobalWorkerOptions.workerSrc=
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

    const data=await file.arrayBuffer();
    const pdf=await pdfjs.getDocument({data}).promise;

    let lines=[];

    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo);
      const content=await page.getTextContent();
      const grouped=new Map();

      for(const item of content.items){
        if(!item.str?.trim())continue;

        const y=Math.round(item.transform[5]);

        grouped.set(y,[
          ...(grouped.get(y)||[]),
          item.str.trim()
        ]);
      }

      lines.push(
        ...[...grouped.entries()]
          .sort((a,b)=>b[0]-a[0])
          .map(x=>x[1].join(' ').replace(/\s+/g,' ').trim())
      );
    }

    const found=[];

    for(const line of lines){
      const m=line.match(
        /^(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:جنيه|ج|EGP|LE)?$/i
      );

      if(!m)continue;

      const name=m[1].replace(/^[-•*\s]+|[-•*\s]+$/g,'').trim();
      const price=Number(m[2].replace(',','.'));

      if(
        name.length>1&&
        name.length<90&&
        Number.isFinite(price)&&
        price>=0&&
        !/^page\s*\d+$/i.test(name)
      ){
        found.push({
          name,
          price,
          category:'cold',
          emoji:'☕',
          description:''
        });
      }
    }

    const unique=[
      ...new Map(
        found.map(x=>[x.name.toLowerCase()+'|'+x.price,x])
      ).values()
    ];

    pdfImportRows=unique;

    if(!unique.length){
      $('#pdfImportStatus').textContent=
        'لم أستطع استخراج صفوف تلقائية. قد يكون الملف صورة ممسوحة ضوئياً أو تنسيقه مختلفاً. جرّب PDF نصياً أو أضف المنتجات يدوياً.';
      return;
    }

    renderPdfPreview();

    $('#pdfImportStatus').textContent=
      `تم استخراج ${unique.length} منتج. راجع البيانات قبل الحفظ.`;

    $('#pdfPreviewWrap').hidden=false;
    $('#savePdfProducts').disabled=false;

  }catch(err){
    console.error(err);

    $('#pdfImportStatus').textContent=
      'تعذر قراءة الملف. تأكد أنه PDF صالح وحاول مرة أخرى.';
  }
};

function renderPdfPreview(){
  $('#pdfPreviewRows').innerHTML=pdfImportRows.map((p,i)=>`
    <tr>
      <td>
        <input class="pdf-preview-name"
          data-pdf-name="${i}"
          value="${escapeHtml(p.name)}">
      </td>
      <td>
        <input class="pdf-preview-price"
          type="number"
          min="0"
          step="0.01"
          data-pdf-price="${i}"
          value="${p.price}">
      </td>
      <td>
        <select class="pdf-preview-category" data-pdf-category="${i}">
          <option value="cold" ${p.category==='cold'?'selected':''}>مشروبات باردة</option>
          <option value="hot">مشروبات ساخنة</option>
          <option value="juice">عصائر</option>
          <option value="snack">سناكس</option>
          <option value="market">ماركت</option>
        </select>
      </td>
      <td>
        <button type="button" data-pdf-remove="${i}">حذف</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-pdf-remove]').forEach(b=>{
    b.onclick=()=>{
      pdfImportRows.splice(Number(b.dataset.pdfRemove),1);
      renderPdfPreview();
      $('#savePdfProducts').disabled=!pdfImportRows.length;
    };
  });
}

// Save Imported PDF Products
$('#savePdfProducts').onclick=async()=>{
  const rows=[];

  for(let i=0;i<pdfImportRows.length;i++){
    const name=$(`[data-pdf-name="${i}"]`).value.trim();
    const price=Number($(`[data-pdf-price="${i}"]`).value);
    const category=$(`[data-pdf-category="${i}"]`).value;

    if(name&&Number.isFinite(price)&&price>=0){
      rows.push({...pdfImportRows[i],name,price,category});
    }
  }

  if(!rows.length){
    toast('لا توجد منتجات صالحة للحفظ');
    return;
  }

  if(!connected||!currentUser){
    toast('يجب تسجيل الدخول وربط Firebase أولاً');
    return;
  }

  const btn=$('#savePdfProducts');

  btn.disabled=true;
  btn.textContent='جاري الحفظ...';

  try{
    for(const product of rows){
      const ref=await addDoc(collection(db,'products'),product);
      products.push({id:ref.id,...product});
    }

    renderProducts();
    renderAdminProducts();

    $('#statProducts').textContent=products.length;

    toast(`تم استيراد ${rows.length} منتج بنجاح`);

    pdfModal.classList.add('hidden');

  }catch(err){
    console.error(err);
    toast('حدث خطأ أثناء الحفظ. راجع صلاحيات Firebase.');

  }finally{
    btn.disabled=false;
    btn.textContent='حفظ المنتجات في الموقع';
  }
};
