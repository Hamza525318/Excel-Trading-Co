const fetchData = async()=>{
    const data = await fetch('./data/rivets.json').then((res)=> res.json());
    console.log(data);
}


const productData = fetchData();